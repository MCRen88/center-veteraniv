-- Migration 010: Add user_visits table and presence fields to profiles

-- 1. Extend profiles table with activity and presence fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_page text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_device text;

-- 2. Create user_visits table for logging visits, logins, and sessions
CREATE TABLE IF NOT EXISTS public.user_visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_role text DEFAULT 'guest',
  session_id text NOT NULL,
  path text NOT NULL,
  page_title text,
  action text NOT NULL DEFAULT 'visit', -- 'login', 'visit', 'heartbeat', 'logout'
  ip_address text,
  user_agent text,
  browser text,
  os text,
  device_type text, -- 'Desktop', 'Mobile', 'Tablet'
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- 3. Create indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_user_visits_user_id ON public.user_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_created_at ON public.user_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_visits_last_seen_at ON public.user_visits(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_visits_session_id ON public.user_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_action ON public.user_visits(action);

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- 4. Permissions and RLS settings
ALTER TABLE public.user_visits DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.user_visits TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_visits TO authenticated, anon;
