#!/bin/bash

# =========================================================================
# 🚀 Production Deployment & Update Script for LMS Portal (lms.ele.zp.ua)
# =========================================================================

# Ensure script is run from the directory where it's located
cd "$(dirname "$0")"

echo "==========================================="
echo " 🌐 Початок оновлення продуктового серверу"
echo "==========================================="

# 1. Pull latest code changes
echo "📥 [1/4] Отримання останніх змін з репозиторію Git..."
git pull

# 2. Apply database migrations
echo "🗄️ [2/4] Застосування нових міграцій бази даних..."
if [ -f "./apply_migration.sh" ]; then
    ./apply_migration.sh
else
    echo "⚠️ Попередження: Скрипт apply_migration.sh не знайдено, пробуємо запустити міграцію напряму..."
    docker exec -i supabase-db-lms psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/004_update_questions.sql
fi

# 3. Build frontend assets
echo "📦 [3/4] Збирання продуктового фронтенду..."
if command -v npm &> /dev/null; then
    npm install
    npm run build
else
    echo "❌ Помилка: Node.js / npm не знайдено. Будь ласка, встановіть їх для збирання фронтенду."
    exit 1
fi

# 4. Copy built files to public directory (if not already there)
CURRENT_DIR=$(pwd)
TARGET_DIR="/opt/lms-portal"

echo "📂 [4/4] Оновлення статичних файлів..."
if [ "$CURRENT_DIR" != "$TARGET_DIR" ]; then
    echo "💡 Скрипт запущено не з $TARGET_DIR. Копіюємо збірку в $TARGET_DIR..."
    if [ -d "$TARGET_DIR" ]; then
        sudo rm -rf "$TARGET_DIR/dist"
        sudo cp -r dist "$TARGET_DIR/"
        echo "✅ Файли скопійовано в $TARGET_DIR/dist"
    else
        echo "⚠️ Попередження: Цільову папку $TARGET_DIR не знайдено. Якщо ви хостите сайт з іншої папки, переконайтеся, що Nginx налаштовано на $CURRENT_DIR/dist."
    fi
else
    echo "✅ Збірка знаходиться в $TARGET_DIR/dist. Додаткове копіювання не потрібне."
fi

# Restarting nginx or reloading configuration
echo "🔄 Перезапуск конфігурації Nginx..."
if command -v systemctl &> /dev/null; then
    sudo systemctl reload nginx
    echo "✅ Конфігурацію Nginx успішно оновлено!"
else
    echo "⚠️ Попередження: Не вдалося перезавантажити Nginx через systemctl. Перевірте статус Nginx вручну."
fi

echo "==========================================="
echo " 🎉 Оновлення завершено!"
echo "==========================================="
