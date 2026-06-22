import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54329';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const newAdmin = {
  email: 'zdorovets.oleksii@zoippo.net.ua',
  password: 'Nbytghjqlti@',
  name: 'Олексій Здоровець',
  role: 'admin',
  testPermission: true
};

async function addAdmin() {
  console.log(`Creating user ${newAdmin.email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: newAdmin.email,
    password: newAdmin.password,
    email_confirm: true,
    user_metadata: { name: newAdmin.name, role: newAdmin.role }
  });

  if (error) {
    console.error(`Error creating user ${newAdmin.email}:`, error.message);
    return;
  }

  if (data.user) {
    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      test_permission: newAdmin.testPermission
    });

    if (profileError) {
      console.error(`Error creating profile for ${newAdmin.email}:`, profileError.message);
    } else {
      console.log(`Successfully created user and profile for ${newAdmin.email}`);
    }
  }
}

addAdmin();
