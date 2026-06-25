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
  console.log(`Creating/updating user ${newAdmin.email}...`);
  
  let userId;
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: newAdmin.email,
    password: newAdmin.password,
    email_confirm: true,
    user_metadata: { name: newAdmin.name, role: newAdmin.role }
  });

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log(`User ${newAdmin.email} already exists. Finding user ID...`);
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError.message);
        return;
      }
      
      const existingUser = usersData.users.find(u => u.email === newAdmin.email);
      if (!existingUser) {
        console.error(`User with email ${newAdmin.email} not found in listing.`);
        return;
      }
      
      userId = existingUser.id;
      console.log(`Updating existing user ${newAdmin.email} (ID: ${userId})...`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newAdmin.password,
        user_metadata: { name: newAdmin.name, role: newAdmin.role }
      });
      
      if (updateError) {
        console.error(`Error updating user password/metadata:`, updateError.message);
        return;
      }
    } else {
      console.error(`Error creating user ${newAdmin.email}:`, error.message);
      return;
    }
  } else {
    userId = data.user.id;
  }

  if (userId) {
    console.log(`Upserting profile for user ${newAdmin.email} (ID: ${userId})...`);
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      test_permission: newAdmin.testPermission
    });

    if (profileError) {
      console.error(`Error upserting profile for ${newAdmin.email}:`, profileError.message);
    } else {
      console.log(`Successfully configured admin user and profile for ${newAdmin.email}`);
    }
  }
}

addAdmin();
