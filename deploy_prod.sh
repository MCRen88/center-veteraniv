#!/bin/bash

# =========================================================================
# 🚀 Production Deployment & Update Script for LMS Portal (lms.ele.zp.ua)
# =========================================================================

# Ensure script is run from the directory where it's located
cd "$(dirname "$0")"
set -euo pipefail

echo "==========================================="
echo " 🌐 Початок оновлення продуктового серверу"
echo "==========================================="

# 1. Pull latest code changes
echo "📥 [1/4] Отримання останніх змін з репозиторію Git..."
git pull

# 2. Apply database migrations
echo "🗄️ [2/4] Застосування нових міграцій бази даних..."
# Applies only migrations that were not applied yet (see apply_migration.sh).
./apply_migration.sh

# Visit logs hold personal data: keep 180 days.
docker exec -i supabase-db-lms psql -U postgres -d postgres -tAc "SELECT 'Видалено старих записів візитів: ' || public.purge_old_visits(180);"

# Rebuild and (re)start the api service if its code changed.
docker compose up -d --build api

# Access rules must hold after every deploy.
./scripts/check-rls.sh

# 3. Build frontend assets
echo "📦 [3/4] Збирання продуктового фронтенду..."
if command -v npm &> /dev/null; then
    npm ci
    npm run build
    # The service_role key must never end up in the public bundle.
    node scripts/check-bundle.mjs dist
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
