-- Migration 013: turn row level security on for the core tables.
--
-- 001_schema.sql disabled RLS on profiles, questions, test_scores, registry and
-- applications. 002_rls.sql was meant to enable it, but the old deploy script
-- applied only 004-010, and 011 marked 001-010 as applied without checking.
-- On such a database:
--   * anon could read every profile (names, emails);
--   * any signed-in user could set their own role to 'admin' or grant
--     themselves test_permission;
--   * any signed-in user could insert, change or delete registry entries
--     (the public certificate registry) and change or delete applications.
--
-- This migration is idempotent: it drops the policies of 002 (if present) and
-- recreates them with explicit roles and WITH CHECK clauses.
-- SECURITY DEFINER functions (get_user_role, enforce_test_score,
-- submit_application, get_questions_full, touch_profile, ...) are owned by the
-- table owner and are not affected. The api service uses service_role, which
-- has BYPASSRLS.

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;

-- 1. profiles ------------------------------------------------------------------
-- Read: own row, or staff. Write: admins only (the api service creates users).
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can revoke own test permission" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id OR get_user_role() IN ('admin', 'teacher') );

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING ( get_user_role() = 'admin' )
WITH CHECK ( get_user_role() = 'admin' );

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING ( get_user_role() = 'admin' );

-- 2. questions -------------------------------------------------------------------
-- Column privileges from 012 still hide correct/explanation from candidates.
REVOKE ALL ON public.questions FROM anon;

DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can modify questions" ON public.questions;

CREATE POLICY "Authenticated users can read questions"
ON public.questions FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Admins can modify questions"
ON public.questions FOR ALL
TO authenticated
USING ( get_user_role() = 'admin' )
WITH CHECK ( get_user_role() = 'admin' );

-- 3. test_scores -------------------------------------------------------------------
-- Insert is further checked and rescored by the enforce_test_score trigger.
DROP POLICY IF EXISTS "Users can read own test scores or admins/teachers can read all" ON public.test_scores;
DROP POLICY IF EXISTS "Users can insert own test scores or admins/teachers can insert" ON public.test_scores;

CREATE POLICY "Users can read own test scores or admins/teachers can read all"
ON public.test_scores FOR SELECT
TO authenticated
USING ( auth.uid() = user_id OR get_user_role() IN ('admin', 'teacher') );

CREATE POLICY "Users can insert own test scores or admins/teachers can insert"
ON public.test_scores FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = user_id OR get_user_role() IN ('admin', 'teacher') );

-- 4. registry ------------------------------------------------------------------------
-- Public read (certificate lookup); changes by admins only.
REVOKE ALL ON public.registry FROM anon;
GRANT SELECT ON public.registry TO anon;

DROP POLICY IF EXISTS "Anyone can view registry" ON public.registry;
DROP POLICY IF EXISTS "Admins can modify registry" ON public.registry;

CREATE POLICY "Anyone can view registry"
ON public.registry FOR SELECT
TO anon, authenticated
USING ( true );

CREATE POLICY "Admins can modify registry"
ON public.registry FOR ALL
TO authenticated
USING ( get_user_role() = 'admin' )
WITH CHECK ( get_user_role() = 'admin' );

-- 5. applications ----------------------------------------------------------------------
-- Submitted only through submit_application() (011); read and managed by admins.
REVOKE ALL ON public.applications FROM anon;
REVOKE INSERT ON public.applications FROM authenticated;

DROP POLICY IF EXISTS "Anyone can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view and manage applications" ON public.applications;

CREATE POLICY "Admins can view and manage applications"
ON public.applications FOR ALL
TO authenticated
USING ( get_user_role() = 'admin' )
WITH CHECK ( get_user_role() = 'admin' );
