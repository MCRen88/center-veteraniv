import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase';

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error("Missing VITE_SUPABASE_SERVICE_KEY environment variable.");
}

export const supabaseAdmin = createClient<any>(
  supabaseUrl, 
  supabaseServiceKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);
