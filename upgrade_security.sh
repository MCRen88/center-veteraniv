#!/bin/bash
# =========================================================================
# Security upgrade for a production server of LMS Portal (lms.ele.zp.ua)
#
# Run once on a server deployed before migration 011. Safe to run again.
#
#   ./upgrade_security.sh --check          preflight checks only, no changes
#   ./upgrade_security.sh                  full upgrade
#
# Options:
#   --rotate-keys       rotate JWT_SECRET and API keys even if done before
#   --no-rotate         do not rotate keys
#   --skip-nginx-check  do not require /api/otp/ and the headers snippet in nginx
#
# Steps:
#   1. Preflight: tools, clean git tree, .env, SMTP credentials, nginx config.
#   2. git pull --ff-only.
#   3. Backup .env and a database dump to $BACKUP_DIR (default ~/lms-portal-backups).
#   4. .env: remove VITE_SUPABASE_SERVICE_KEY, set OTP_SECRET/API_PORT, rotate keys
#      (by default once: the old bundle contained the service_role key).
#   5. Install the nginx security headers snippet.
#   6. ./deploy_prod.sh: migrations (incl. 011-013), full stack restart, RLS checks,
#      frontend build + bundle check, copy to /opt/lms-portal/dist, nginx reload.
#   7. Post-checks: api health, public site, signup disabled.
# =========================================================================
set -euo pipefail
cd "$(dirname "$0")"

CHECK_ONLY=0
ROTATE=auto
NGINX_CHECK=1
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --rotate-keys) ROTATE=yes ;;
    --no-rotate) ROTATE=no ;;
    --skip-nginx-check) NGINX_CHECK=0 ;;
    -h|--help) sed -n 2,26p "$0"; exit 0 ;;
    *) echo "❌ Невідомий параметр: $arg (див. --help)"; exit 2 ;;
  esac
done

BACKUP_DIR="${BACKUP_DIR:-$HOME/lms-portal-backups}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db-lms}"
STAMP="$(date +%Y%m%d-%H%M%S)"

env_get() {
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}
is_placeholder() {
  [[ -z "$1" || "$1" =~ ^(your-|generate-|change-?me) ]]
}

echo "==========================================="
echo " 🔐 Оновлення безпеки LMS Portal"
echo "==========================================="

# ---- 1. Preflight (no changes) ---------------------------------------------
echo "🔎 [1/7] Попередні перевірки..."
ERRORS=0
fail() { echo "  ❌ $1"; ERRORS=$((ERRORS + 1)); }
ok() { echo "  ✅ $1"; }

for cmd in git docker node npm curl gzip; do
  command -v "$cmd" > /dev/null 2>&1 && ok "$cmd" || fail "не встановлено: $cmd"
done
if command -v node > /dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$NODE_MAJOR" -ge 18 ] && ok "Node.js $NODE_MAJOR" || fail "потрібен Node.js 18+, є $NODE_MAJOR"
fi
docker compose version > /dev/null 2>&1 && ok "docker compose" || fail "docker compose недоступний"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  fail "у репозиторії є незакомічені зміни (git status)"
else
  ok "робоче дерево git чисте"
fi

if [ ! -f .env ]; then
  fail ".env не знайдено (шаблон: .env.production.example)"
else
  ok ".env знайдено"
  is_placeholder "$(env_get SMTP_USER)" && fail "SMTP_USER не задано в .env (адреса Gmail)" || ok "SMTP_USER задано"
  is_placeholder "$(env_get SMTP_PASS)" && fail "SMTP_PASS не задано в .env (App Password Gmail)" || ok "SMTP_PASS задано"
  [ -n "$(env_get KONG_PORT)" ] && ok "KONG_PORT задано" || fail "KONG_PORT не задано в .env (nginx проксіює на 54330)"
  [ -n "$(env_get SITE_URL)" ] && ok "SITE_URL задано" || fail "SITE_URL не задано в .env"
fi

if [ "$NGINX_CHECK" -eq 1 ]; then
  if NGINX_CONF="$(sudo nginx -T 2>/dev/null)"; then
    grep -q 'location \^~ /api/otp/' <<< "$NGINX_CONF" && ok "nginx: є location /api/otp/" \
      || fail "nginx: немає location /api/otp/ та /api/admin/ (скопіюйте з nginx.conf.template)"
    grep -q 'location = /api/health' <<< "$NGINX_CONF" && ok "nginx: є location /api/health" \
      || fail "nginx: немає location = /api/health (скопіюйте з nginx.conf.template)"
    grep -q 'lms-security-headers.conf' <<< "$NGINX_CONF" && ok "nginx: підключено lms-security-headers.conf" \
      || fail "nginx: не підключено snippets/lms-security-headers.conf (див. nginx.conf.template)"
  else
    fail "не вдалося прочитати конфігурацію nginx (sudo nginx -T)"
  fi
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "❌ Попередні перевірки: помилок $ERRORS. Нічого не змінено."
  exit 1
fi
if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "✅ Попередні перевірки пройдено (--check: нічого не змінено)."
  exit 0
fi

# ---- 2. Code ----------------------------------------------------------------
echo "📥 [2/7] Оновлення коду..."
git pull --ff-only

# ---- 3. Backups ---------------------------------------------------------------
echo "💾 [3/7] Резервні копії в $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
cp -p .env "$BACKUP_DIR/env-$STAMP"
chmod 600 "$BACKUP_DIR/env-$STAMP"
DUMP="$BACKUP_DIR/db-$STAMP.sql.gz"
docker exec "$DB_CONTAINER" pg_dump -U postgres -d postgres --no-owner | gzip > "$DUMP"
chmod 600 "$DUMP"
if ! gzip -t "$DUMP" || [ "$(zcat "$DUMP" | grep -c 'CREATE TABLE')" -lt 5 ]; then
  echo "❌ Дамп бази даних порожній або пошкоджений: $DUMP. Зупиняюся."
  exit 1
fi
echo "  ✅ .env → $BACKUP_DIR/env-$STAMP"
echo "  ✅ БД → $DUMP ($(du -h "$DUMP" | cut -f1))"

# ---- 4. .env --------------------------------------------------------------------
echo "🔑 [4/7] Оновлення .env..."
ROTATE_ARG=""
case "$ROTATE" in
  yes) ROTATE_ARG="--rotate" ;;
  auto) [ -z "$(env_get KEYS_ROTATED_AT)" ] && ROTATE_ARG="--rotate" ;;
esac
if [ -n "$ROTATE_ARG" ]; then
  echo "  ♻️ Ротація JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY: усі користувачі увійдуть заново."
else
  echo "  ℹ️ Ротація ключів пропущена (вже виконана або --no-rotate)."
fi
node scripts/upgrade-env.mjs $ROTATE_ARG

# ---- 5. nginx snippet --------------------------------------------------------------
echo "🛡️ [5/7] Заголовки безпеки nginx..."
SNIPPET=/etc/nginx/snippets/lms-security-headers.conf
if sudo cmp -s nginx-security-headers.conf "$SNIPPET"; then
  echo "  ✅ $SNIPPET актуальний"
else
  sudo install -D -m 644 nginx-security-headers.conf "$SNIPPET"
  echo "  ✅ $SNIPPET встановлено"
fi

# ---- 6. Deploy -------------------------------------------------------------------------
echo "🚀 [6/7] Деплой (deploy_prod.sh)..."
SKIP_PULL=1 ./deploy_prod.sh

# ---- 7. Post-checks ----------------------------------------------------------------------
echo "🔍 [7/7] Перевірки після деплою..."
POST_ERRORS=0
API_PORT="$(env_get API_PORT)"
SITE_URL="$(env_get SITE_URL)"

if curl -fsS --max-time 10 "http://127.0.0.1:${API_PORT:-54474}/api/health" > /dev/null; then
  echo "  ✅ api сервіс відповідає"
else
  echo "  ❌ api сервіс не відповідає: docker logs supabase-api-lms"
  POST_ERRORS=$((POST_ERRORS + 1))
fi
# Check the body: without the location the SPA fallback answers 200 with index.html.
if curl -fsS --max-time 10 "$SITE_URL/api/health" | grep -q '"ok":true'; then
  echo "  ✅ $SITE_URL/api/health доступний через nginx"
else
  echo "  ❌ $SITE_URL/api/health недоступний: перевірте location /api/ у nginx"
  POST_ERRORS=$((POST_ERRORS + 1))
fi
SITE_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$SITE_URL/")"
if [ "$SITE_CODE" = "200" ]; then
  echo "  ✅ сайт $SITE_URL відповідає 200"
else
  echo "  ❌ сайт $SITE_URL відповідає $SITE_CODE"
  POST_ERRORS=$((POST_ERRORS + 1))
fi
HEADERS="$(curl -sI --max-time 10 "$SITE_URL/")"
if grep -qi '^x-content-type-options: nosniff' <<< "$HEADERS"; then
  echo "  ✅ заголовки безпеки присутні"
else
  echo "  ❌ заголовків безпеки немає у відповіді сайту"
  POST_ERRORS=$((POST_ERRORS + 1))
fi

echo "==========================================="
if [ "$POST_ERRORS" -gt 0 ]; then
  echo " ⚠️ Оновлення виконано, але перевірок не пройдено: $POST_ERRORS"
  echo " Відкат: .env з $BACKUP_DIR/env-$STAMP, БД з $DUMP"
  echo "==========================================="
  exit 1
fi
echo " 🎉 Оновлення безпеки завершено"
[ -n "$ROTATE_ARG" ] && echo " ℹ️ Ключі змінено: усім користувачам потрібно увійти знову."
echo " Резервні копії: $BACKUP_DIR (*-$STAMP)"
echo "==========================================="
