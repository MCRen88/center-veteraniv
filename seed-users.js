import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const kongPort = process.env.KONG_PORT || '54329';
const supabaseUrl = `http://localhost:${kongPort}`;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const defaultUsers = [
  { email: 'admin@zoippo.ua', password: '123', name: 'Адміністратор', role: 'admin', testPermission: true },
  { email: 'teacher@zoippo.ua', password: '123', name: 'Викладач ЗОІППО', role: 'teacher', testPermission: false },
  { email: 'user@zoippo.ua', password: '123', name: 'Іваненко Іван Іванович', role: 'user', testPermission: false }
];

async function seed() {
  for (const u of defaultUsers) {
    console.log(`Creating user ${u.email}...`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role }
    });

    if (error) {
      console.error(`Error creating user ${u.email}:`, error.message);
      continue;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: data.user.id,
        name: u.name,
        email: u.email,
        role: u.role,
        test_permission: u.testPermission
      });

      if (profileError) {
        console.error(`Error creating profile for ${u.email}:`, profileError.message);
      } else {
        console.log(`Successfully created user and profile for ${u.email}`);
      }
    }
  }
}

seed();
