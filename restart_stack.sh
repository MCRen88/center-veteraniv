#!/bin/bash

echo "==========================================="
echo " 🔄 Перезапуск стеку LMS Portal"
echo "==========================================="

# Переходимо в директорію зі скриптом
cd "$(dirname "$0")"

echo "[1/4] Зупинка Docker контейнерів..."
docker compose down

echo "[2/4] Запуск Docker контейнерів у фоновому режимі..."
docker compose up -d

echo "[3/4] Очікування ініціалізації сервісів (10 секунд)..."
sleep 10

echo "[4/4] Перевірка статусу контейнерів..."
docker compose ps

echo ""
echo "-------------------------------------------"
echo "🔍 Перевірка доступності сервісів:"

# Перевірка Supabase Studio
if curl -s -o /dev/null http://localhost:54327; then
    echo "✅ Supabase Studio (порт 54327): ДОСТУПНО"
else
    echo "❌ Supabase Studio (порт 54327): НЕ ВІДПОВІДАЄ"
fi

# Перевірка Kong API Gateway
if curl -s -o /dev/null http://localhost:54329; then
    echo "✅ API Gateway Kong (порт 54329): ДОСТУПНО"
else
    echo "❌ API Gateway Kong (порт 54329): НЕ ВІДПОВІДАЄ"
fi

# Перевірка бази даних через pg_isready всередині контейнера
if docker exec supabase-db-lms pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ База даних PostgreSQL (порт 54328): ГОТОВА ДО З'ЄДНАНЬ"
else
    echo "❌ База даних PostgreSQL: НЕ ГОТОВА"
fi

# Перевірка Frontend (Vite)
if curl -s -o /dev/null http://localhost:5173 || curl -s -o /dev/null http://localhost:5174; then
    echo "✅ Frontend Vite (порт 5173/5174): ПРАЦЮЄ"
else
    echo "⚠️ Frontend Vite: НЕ ЗАПУЩЕНО"
    echo "💡 Щоб запустити frontend, відкрийте новий термінал та виконайте: npm run dev"
fi

echo "==========================================="
echo " 🎉 Операцію завершено!"
echo "==========================================="
