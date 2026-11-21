#!/bin/bash
# =========================================================================
# Apply database migrations for LMS Portal (lms.ele.zp.ua)
#
# Every file in supabase/migrations is applied once, in name order, each in
# its own transaction, and recorded in public.app_migrations.
# Re-running the script is safe: applied files are skipped. (Previously every
# deploy re-ran 004/006/007, which TRUNCATE questions and cases.)
#
#   ./apply_migration.sh            apply all pending migrations
#   ./apply_migration.sh FILE.sql   apply one file again on purpose (e.g. a re-seed)
# =========================================================================
set -euo pipefail
cd "$(dirname "$0")"

DB_CONTAINER="${DB_CONTAINER:-supabase-db-lms}"
MIGRATIONS_DIR="supabase/migrations"

# Read one variable from .env without sourcing it (values may contain spaces).
env_get() {
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

psql_db() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

echo "==========================================="
echo " ⚙️ Запуск міграцій бази даних"
echo "==========================================="

if ! docker ps > /dev/null 2>&1; then
  echo "❌ Помилка: Docker не запущено або немає доступу (спробуйте sudo)."
  exit 1
fi
if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null)" != "true" ]; then
  echo "❌ Помилка: Контейнер бази даних $DB_CONTAINER не запущений."
  echo "💡 Запустіть стек перед міграцією: ./restart_stack.sh"
  exit 1
fi

# Bootstrap bookkeeping on a database created before 011: 001-010 are already applied there.
HAS_TABLE=$(psql_db -tAc "SELECT to_regclass('public.app_migrations') IS NOT NULL")
if [ "$HAS_TABLE" != "t" ]; then
  HAS_SCHEMA=$(psql_db -tAc "SELECT to_regclass('public.profiles') IS NOT NULL")
  psql_db -qc "CREATE TABLE public.app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON public.app_migrations FROM anon, authenticated;"
  if [ "$HAS_SCHEMA" = "t" ]; then
    echo "ℹ️ Існуюча база: позначаю міграції 001–010 як уже застосовані."
    for f in "$MIGRATIONS_DIR"/0{0[1-9],10}_*.sql; do
      psql_db -qc "INSERT INTO public.app_migrations (name) VALUES ('$(basename "$f")') ON CONFLICT DO NOTHING;"
    done
  fi
fi

apply_file() {
  local name="$1"
  echo "⏳ Застосування міграції $name..."
  { cat "$MIGRATIONS_DIR/$name"; echo; echo "INSERT INTO public.app_migrations (name) VALUES ('$name') ON CONFLICT (name) DO UPDATE SET applied_at = now();"; } \
    | psql_db --single-transaction -q -f -
  echo "✅ $name"
}

if [ $# -gt 0 ]; then
  for name in "$@"; do apply_file "$(basename "$name")"; done
else
  APPLIED=$(psql_db -tAc "SELECT name FROM public.app_migrations")
  PENDING=0
  for f in "$MIGRATIONS_DIR"/*.sql; do
    name=$(basename "$f")
    if ! grep -qxF "$name" <<< "$APPLIED"; then
      apply_file "$name"
      PENDING=$((PENDING + 1))
    fi
  done
  [ "$PENDING" -eq 0 ] && echo "✅ Нових міграцій немає."
fi

POSTGRES_PASSWORD="$(env_get POSTGRES_PASSWORD)"
if [ -n "$POSTGRES_PASSWORD" ]; then
  echo "🔑 Синхронізація пароля supabase_admin..."
  # Passed as a psql variable so quotes in the password cannot break the SQL.
  echo "ALTER USER supabase_admin WITH PASSWORD :'pw';" | psql_db -q -v pw="$POSTGRES_PASSWORD" -f -
fi

echo "🔍 Питань: $(psql_db -tAc 'SELECT count(*) FROM public.questions') · кейсів: $(psql_db -tAc 'SELECT count(*) FROM public.cases')"
echo "==========================================="
