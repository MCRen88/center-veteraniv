import crypto from 'crypto';

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = crypto.createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  return `${encodedHeader}.${encodedPayload}.${base64url(signature)}`;
}

// Generate random secure strings
const postgresPassword = crypto.randomBytes(24).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');

// Standard Supabase payload definitions
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 years
};

const serviceRolePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 years
};

const anonKey = signJWT(anonPayload, jwtSecret);
const serviceRoleKey = signJWT(serviceRolePayload, jwtSecret);

console.log('========================================================================');
console.log('🔐 ГЕНЕРАТОР КЛЮЧІВ ДЛЯ PRODUCTION ДЕПЛОЮ (LMS PORTAL)');
console.log('========================================================================');
console.log('Скопіюйте ці значення та вставте їх у файл .env на сервері:\n');
console.log(`POSTGRES_PASSWORD=${postgresPassword}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
console.log('\n------------------------------------------------------------------------');
console.log('Vite клієнтські змінні (також скопіюйте їх у .env):');
console.log(`VITE_SUPABASE_ANON_KEY=${anonKey}`);
console.log(`VITE_SUPABASE_SERVICE_KEY=${serviceRoleKey}`);
console.log('========================================================================');
console.log('💡 Зверніть увагу: Ці ключі згенеровані на основі унікального JWT_SECRET.');
console.log('Зберігайте їх у безпечному місці та не коммітьте файл .env у Git!');
console.log('========================================================================');
