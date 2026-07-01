#!/bin/bash

# =========================================================================
# 🔄 Script to Apply Database Migration for LMS Portal (lms.ele.zp.ua)
# =========================================================================

# Go to script directory
cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_CONTAINER="supabase-db-lms"
MIGRATION_FILE="004_update_questions.sql"
MIGRATION_PATH="/docker-entrypoint-initdb.d/$MIGRATION_FILE"

echo "==========================================="
echo " ⚙️ Запуск міграції бази даних"
echo "==========================================="

# Check if docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Помилка: Docker не запущено або немає доступу (спробуйте sudo)."
    exit 1
fi

# Check if the database container is running
if [ "$(docker inspect -f '{{.State.Running}}' $DB_CONTAINER 2>/dev/null)" != "true" ]; then
    echo "❌ Помилка: Контейнер бази даних $DB_CONTAINER не запущений."
    echo "💡 Запустіть стек перед міграцією: ./restart_stack.sh"
    exit 1
fi

echo "⏳ Застосування міграції $MIGRATION_FILE у контейнері $DB_CONTAINER..."

# Run migration file using docker exec
docker exec -i $DB_CONTAINER psql -U postgres -d postgres -f "$MIGRATION_PATH"

if [ $? -eq 0 ]; then
    echo "🔑 Оновлення та синхронізація пароля для supabase_admin..."
    docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "ALTER USER supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';"
    
    echo "-------------------------------------------"
    echo "✅ Міграцію успішно застосовано!"
    echo "🔍 Поточна кількість питань в базі даних:"
    docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "SELECT count(*) FROM public.questions;"
    echo "==========================================="
else
    echo "❌ Помилка: Не вдалося застосувати міграцію."
    exit 1
fi
