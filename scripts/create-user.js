// Create a user (or update an existing one) with a profile, using the service_role key.
// Run on the server, from the repo root:
//   node scripts/create-user.js <email> "<full name>" [user|teacher|admin]
// The password is taken from USER_PASSWORD; without it a random one is generated and printed once.
// Reads SERVICE_ROLE_KEY and KONG_PORT from .env.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const [email, name, role = 'user'] = process.argv.slice(2);
if (!email || !name || !['user', 'teacher', 'admin'].includes(role)) {
  console.error('Usage: node scripts/create-user.js <email> "<full name>" [user|teacher|admin]');
  process.exit(1);
}

const serviceKey = process.env.SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('SERVICE_ROLE_KEY is not set (.env)');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || `http://localhost:${process.env.KONG_PORT || '54329'}`;
const password = process.env.USER_PASSWORD || crypto.randomBytes(12).toString('base64url');
const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserId(address) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(u => u.email?.toLowerCase() === address.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
}

async function main() {
  const metadata = { name, role };
  let userId;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error) {
    userId = await findUserId(email);
    if (!userId) throw error;
    const { error: updateError } = await db.auth.admin.updateUserById(userId, { password, user_metadata: metadata });
    if (updateError) throw updateError;
    console.log(`Updated existing user ${email}`);
  } else {
    userId = data.user.id;
    console.log(`Created user ${email}`);
  }

  const { error: profileError } = await db.from('profiles').upsert({
    id: userId, name, email, role, test_permission: role !== 'user'
  });
  if (profileError) throw profileError;

  if (!process.env.USER_PASSWORD) console.log(`Generated password (shown once): ${password}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
