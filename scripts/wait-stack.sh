#!/bin/bash
# Waits until the stack really serves requests through Kong:
#   * PostgREST has loaded its schema cache (no 503 PGRST002),
#   * GoTrue answers /auth/v1/health (Kong resolved the "auth" host).
# Kong resolves upstream names when it starts; if auth or rest were recreated
# at the same time, Kong can keep answering "name resolution failed". In that
# case Kong is restarted once.
#
#   scripts/wait-stack.sh [timeout_seconds]   (default 180)
set -uo pipefail
cd "$(dirname "$0")/.."

env_get() {
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

TIMEOUT="${1:-180}"
ANON_KEY="$(env_get ANON_KEY)"
KONG_PORT="$(env_get KONG_PORT)"
BASE="http://127.0.0.1:${KONG_PORT:-54471}"
KONG_RESTARTED=0
START=$(date +%s)

status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 5 -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "$1"
}

echo "⏳ Очікування готовності REST і Auth (до ${TIMEOUT} с)..."
while true; do
  REST=$(status "$BASE/rest/v1/registry?select=id&limit=1")
  AUTH=$(status "$BASE/auth/v1/health")
  if [ "$REST" = "200" ] && [ "$AUTH" = "200" ]; then
    echo "✅ Стек готовий за $(( $(date +%s) - START )) с (REST $REST, Auth $AUTH)"
    exit 0
  fi

  ELAPSED=$(( $(date +%s) - START ))
  # Containers are up but Kong still cannot reach them: restart Kong once.
  if [ "$KONG_RESTARTED" -eq 0 ] && [ "$ELAPSED" -ge 60 ]; then
    echo "♻️ Kong не бачить сервіси (REST $REST, Auth $AUTH): перезапуск Kong..."
    docker compose restart kong > /dev/null
    KONG_RESTARTED=1
  fi
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "❌ Стек не готовий за ${TIMEOUT} с (REST $REST, Auth $AUTH)."
    echo "   Логи: docker logs supabase-rest-lms | docker logs supabase-auth-lms | docker logs supabase-kong-lms"
    exit 1
  fi
  sleep 3
done
