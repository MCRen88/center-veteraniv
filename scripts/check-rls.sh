#!/bin/bash
# Checks, with the public anon key, that anonymous visitors cannot read or write
# what they must not. Run after every deploy (deploy_prod.sh does it).
#   API_URL defaults to the local Kong port from .env.
set -uo pipefail
cd "$(dirname "$0")/.."

env_get() {
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

ANON_KEY="${ANON_KEY:-$(env_get ANON_KEY)}"
KONG_PORT="$(env_get KONG_PORT)"
API_URL="${API_URL:-http://127.0.0.1:${KONG_PORT:-54471}}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db-lms}"
if [ -z "$ANON_KEY" ]; then echo "❌ ANON_KEY не знайдено (.env)"; exit 1; fi

FAILED=0
# expect <description> <allowed status codes regex> <body must not match regex or ''> <curl args...>
expect() {
  local desc="$1" codes="$2" forbidden_body="$3"; shift 3
  local out code body
  out=$(curl -s -w '\n%{http_code}' -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H 'Content-Type: application/json' "$@")
  code="${out##*$'\n'}"; body="${out%$'\n'*}"
  if [[ "$code" =~ ^($codes)$ ]] && { [ -z "$forbidden_body" ] || ! grep -qE "$forbidden_body" <<< "$body"; }; then
    echo "✅ $desc"
  else
    echo "❌ $desc (HTTP $code: ${body:0:120})"
    FAILED=1
  fi
}

expect "гість не читає журнал візитів"        '401|403' '' "$API_URL/rest/v1/user_visits?select=id&limit=1"
expect "гість не бачить заяв"                  '200|401|403' '"id"' "$API_URL/rest/v1/applications?select=id&limit=1"
expect "гість не бачить результатів тестів"   '200|401|403' '"id"' "$API_URL/rest/v1/test_scores?select=id&limit=1"
expect "гість не бачить профілів"              '200|401|403' '"id"' "$API_URL/rest/v1/profiles?select=id&limit=1"
expect "гість не бачить відповідей тесту"      '200|401|403' '"correct"' "$API_URL/rest/v1/questions?select=correct&limit=1"
expect "гість не додає кейси"                  '401|403' '' -X POST "$API_URL/rest/v1/cases" -d '{"title":"x"}'
expect "гість не пише заяву напряму"           '401|403' '' -X POST "$API_URL/rest/v1/applications" -d '{"lname":"x"}'
expect "заява без підтвердженого email відхиляється" '400|401|403' '' -X POST "$API_URL/rest/v1/rpc/submit_application" -d '{"p":{"lname":"x","fname":"y","birthdate":"2000-01-01","phone":"1","email":"rls-check@example.invalid"}}'
expect "самореєстрація вимкнена"              '400|403|422' '' -X POST "$API_URL/auth/v1/signup" -d '{"email":"rls-check@example.invalid","password":"Rls-check-123456"}'

# HTTP checks above pass trivially on empty tables, so also check the catalog:
# every table in public must have row level security enabled.
if NO_RLS=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
    "SELECT string_agg(c.relname, ', ') FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity" 2>/dev/null); then
  if [ -z "$NO_RLS" ]; then
    echo "✅ RLS увімкнено на всіх таблицях public"
  else
    echo "❌ RLS вимкнено на таблицях: $NO_RLS"
    FAILED=1
  fi
else
  echo "⚠️ Не вдалося перевірити RLS у контейнері $DB_CONTAINER"
  FAILED=1
fi

exit $FAILED
