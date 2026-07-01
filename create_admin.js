import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Завантаження змінних з .env файлу
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54329';
const SERVICE_KEY = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error("❌ Помилка: Не знайдено SERVICE_ROLE_KEY в .env файлі!");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    console.log("🛠️ Створення адміністратора...");
    const email = 'admin@lms.ele.zp.ua';
    const password = 'AdminPassword123!';
    const name = 'Головний Адміністратор';

    // Створюємо користувача в Auth (GoTrue)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name: name, role: 'admin' }
    });

    if (authError) {
        if (authError.message.includes('already exists')) {
            console.log("✅ Користувач-адміністратор вже існує в базі Auth!");
        } else {
            console.error("❌ Помилка створення в Auth:", authError.message);
            return;
        }
    } else {
        console.log(`✅ Користувача ${email} успішно створено в Auth (ID: ${authData.user.id})`);
        
        // Тепер створюємо профіль у таблиці profiles
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            id: authData.user.id,
            name: name,
            email: email,
            role: 'admin',
            test_permission: true
        });

        if (profileError) {
            console.error("❌ Помилка створення профілю:", profileError.message);
        } else {
            console.log("✅ Профіль адміністратора успішно додано в таблицю profiles!");
            console.log("-----------------------------------------");
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Пароль: ${password}`);
            console.log("-----------------------------------------");
        }
    }
}

createAdmin();
