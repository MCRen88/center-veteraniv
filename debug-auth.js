import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const kongPort = process.env.KONG_PORT || '54329';
const supabaseUrl = `http://localhost:${kongPort}`;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

console.log('--- НАЛАШТУВАННЯ ПІДКЛЮЧЕННЯ ---');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
console.log('Service Key starts with:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'none');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testConnection() {
  console.log('\n--- ТЕСТ З\'ЄДНАННЯ З AUTH (Gotrue) ---');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@test.com`,
      password: 'TemporaryPassword123!',
      email_confirm: true
    });

    if (error) {
      console.log('Помилка отримана від Supabase:');
      console.log('Повний об\'єкт помилки:', error);
      console.log('JSON.stringify(error):', JSON.stringify(error, null, 2));
      console.log('error.message:', error.message);
      console.log('error.status:', error.status);
    } else {
      console.log('✅ Успішно! Тестового користувача створено:', data.user.email);
      // Clean up test user
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('Тестового користувача видалено.');
    }
  } catch (err) {
    console.error('Виникла критична помилка в коді скрипта:', err);
  }
}

testConnection();
