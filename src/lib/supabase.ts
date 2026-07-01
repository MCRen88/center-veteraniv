import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54329';
  
  if (typeof window !== 'undefined') {
    const { hostname, protocol, origin, port } = window.location;
    
    // 1. If accessed over HTTPS, Nginx reverse proxy handles requests on the same secure origin.
    // This also prevents browser mixed-content blocks.
    if (protocol === 'https:') {
      return origin;
    }
    
    // 2. If accessed over HTTP, but from a different machine on the local network (not localhost)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
      const isViteDev = port === '5173' || port === '5174' || port === '3000';
      
      // If served via Nginx on standard HTTP port (no custom port)
      if (!isViteDev && !port) {
        return origin;
      }
      
      // If served via Vite dev server, route to Kong port (e.g. 54329) on the host machine's IP
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/localhost|127\.0\.0\.1/, hostname);
      }
    }
  }
  
  return envUrl;
};

export const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Resolved Supabase URL:', supabaseUrl);

if (!supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_ANON_KEY environment variable.");
}

export const supabase = createClient<any>(
  supabaseUrl, 
  supabaseAnonKey || ''
);
