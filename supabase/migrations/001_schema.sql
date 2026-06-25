CREATE SCHEMA IF NOT EXISTS auth;

-- Define a dummy auth.uid() function so dependent objects and functions compile on database initialization.
-- GoTrue (auth container) will overwrite this function with its own implementation later.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT null::uuid;
$$;

-- Create the roles if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin SUPERUSER NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

ALTER ROLE service_role BYPASSRLS;

-- Grant permissions to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 1. PROFILES (Extends auth.users if auth schema existed, but for standalone docker, we'll just link it conceptually. Actually, Supabase gotrue handles auth schema)
-- To ensure this runs safely after auth schema is available:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, -- FK to auth.users in a real Supabase env. For now just UUID.
  name text NOT NULL,
  email text,
  role text CHECK (role IN ('user', 'teacher', 'admin')) NOT NULL DEFAULT 'user',
  test_permission boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. QUESTIONS
CREATE TABLE public.questions (
  id serial PRIMARY KEY,
  cat_id text NOT NULL,
  cat_name text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL, -- Stored as JSON array
  correct integer NOT NULL,
  explanation text
);

-- 3. TEST SCORES
CREATE TABLE public.test_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  passed boolean NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. REGISTRY
CREATE TABLE public.registry (
  id serial PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  cert text UNIQUE NOT NULL,
  date text NOT NULL
);

-- 5. APPLICATIONS
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_number text UNIQUE NOT NULL,
  lname text NOT NULL,
  fname text NOT NULL,
  mname text,
  birthdate date NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  level text NOT NULL,
  education text NOT NULL,
  experience integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime for all tables (if needed)
-- alter publication supabase_realtime add table public.profiles;
-- alter publication supabase_realtime add table public.questions;
-- alter publication supabase_realtime add table public.test_scores;
-- alter publication supabase_realtime add table public.registry;
-- alter publication supabase_realtime add table public.applications;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Disable Row Level Security since permissions are controlled via role grants and app logic
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
