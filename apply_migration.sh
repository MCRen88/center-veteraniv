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

# If files are passed as arguments, run them; otherwise run default update migrations
if [ $# -gt 0 ]; then
    MIGRATION_FILES=("$@")
else
    MIGRATION_FILES=(
        "004_update_questions.sql"
        "005_cases.sql"
        "006_anonymize_cases.sql"
        "007_update_cases.sql"
        "008_remove_demo_certificates.sql"
        "009_add_signature_details.sql"
    )
fi

for MIGRATION_FILE in "${MIGRATION_FILES[@]}"; do
    MIGRATION_PATH="/docker-entrypoint-initdb.d/$MIGRATION_FILE"
    echo "⏳ Застосування міграції $MIGRATION_FILE у контейнері $DB_CONTAINER..."
    
    docker exec -i $DB_CONTAINER psql -U postgres -d postgres -f "$MIGRATION_PATH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Міграцію $MIGRATION_FILE успішно застосовано!"
    else
        echo "❌ Помилка: Не вдалося застосувати міграцію $MIGRATION_FILE."
        exit 1
    fi
    echo "-------------------------------------------"
done

echo "🔑 Оновлення та синхронізація пароля для supabase_admin..."
docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "ALTER USER supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';"

echo "-------------------------------------------"
echo "✅ Всі міграції успішно застосовано!"
echo "🔍 Поточна кількість питань в базі даних:"
docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "SELECT count(*) FROM public.questions;"
echo "🔍 Поточна кількість кейсів в базі даних:"
docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "SELECT count(*) FROM public.cases;"
echo "==========================================="
