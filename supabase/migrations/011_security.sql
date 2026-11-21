-- Migration 011: security hardening
-- * migration bookkeeping (deploys must not re-run TRUNCATE migrations)
-- * RLS for user_visits and cases
-- * server-side scoring and permission enforcement for test_scores
-- * applications submitted through an RPC: DB-generated number, verified email
-- * DB-generated certificate numbers
-- * email verification codes (written only by the api service)

-- 0. Migration bookkeeping (not "schema_migrations": GoTrue looks that name up via search_path auth,public) ---
CREATE TABLE IF NOT EXISTS public.app_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.app_migrations FROM anon, authenticated;
INSERT INTO public.app_migrations (name) VALUES
  ('001_schema.sql'), ('002_rls.sql'), ('003_seed.sql'), ('004_update_questions.sql'),
  ('005_cases.sql'), ('006_anonymize_cases.sql'), ('007_update_cases.sql'),
  ('008_remove_demo_certificates.sql'), ('009_add_signature_details.sql'),
  ('010_user_visits.sql'), ('011_security.sql')
ON CONFLICT (name) DO NOTHING;

-- 1. Role helper: pin search_path for a SECURITY DEFINER function --------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Profiles: users no longer update their own row directly ------------------
-- Presence fields are written through touch_profile(); the test permission is
-- revoked by the test_scores trigger.
DROP POLICY IF EXISTS "Users can revoke own test permission" ON public.profiles;

CREATE OR REPLACE FUNCTION public.touch_profile(p_path text, p_device text, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles
  SET last_seen_at = CASE WHEN p_action = 'logout' THEN now() - interval '15 minutes' ELSE now() END,
      last_sign_in_at = CASE WHEN p_action = 'login' THEN now() ELSE last_sign_in_at END,
      current_page = left(p_path, 300),
      current_device = left(p_device, 200)
  WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.touch_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_profile(text, text, text) TO authenticated;

-- 3. user_visits: insert-only for visitors, readable by staff -----------------
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_visits FROM anon, authenticated;
GRANT INSERT ON public.user_visits TO anon, authenticated;
GRANT SELECT, DELETE ON public.user_visits TO authenticated;

DROP POLICY IF EXISTS "Visitors can log own visits" ON public.user_visits;
CREATE POLICY "Visitors can log own visits"
ON public.user_visits FOR INSERT
TO anon, authenticated
WITH CHECK ( user_id IS NULL OR user_id = auth.uid() );

DROP POLICY IF EXISTS "Staff can read visits" ON public.user_visits;
CREATE POLICY "Staff can read visits"
ON public.user_visits FOR SELECT
TO authenticated
USING ( get_user_role() IN ('admin', 'teacher') );

DROP POLICY IF EXISTS "Admins can delete visits" ON public.user_visits;
CREATE POLICY "Admins can delete visits"
ON public.user_visits FOR DELETE
TO authenticated
USING ( get_user_role() = 'admin' );

-- Heartbeat: only the tab that created the row knows its random session id.
CREATE OR REPLACE FUNCTION public.touch_visit(p_id uuid, p_session text, p_path text, p_title text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_visits
  SET path = left(p_path, 300), page_title = left(p_title, 200), last_seen_at = now()
  WHERE id = p_id AND session_id = p_session;
$$;
REVOKE ALL ON FUNCTION public.touch_visit(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_visit(uuid, text, text, text) TO anon, authenticated;

-- Retention for personal data in visit logs (called from deploy_prod.sh).
CREATE OR REPLACE FUNCTION public.purge_old_visits(p_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.user_visits WHERE created_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_old_visits(integer) FROM PUBLIC, anon, authenticated;

-- 4. cases: same rules as questions ------------------------------------------
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cases FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read cases" ON public.cases;
CREATE POLICY "Authenticated users can read cases"
ON public.cases FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can modify cases" ON public.cases;
CREATE POLICY "Admins can modify cases"
ON public.cases FOR ALL
TO authenticated
USING ( get_user_role() = 'admin' )
WITH CHECK ( get_user_role() = 'admin' );

-- 5. test_scores: the database scores the exam, not the browser ----------------
-- Candidates (role 'user') need test_permission; it is revoked in the same
-- transaction. Score, total and per-question "correct" are recomputed from the
-- questions table; "passed" can only be lowered by the client (terminated test).
-- Admins and teachers (including impersonation) are trusted as before.
CREATE OR REPLACE FUNCTION public.enforce_test_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Exams have 50 questions; a few may fail to match the bank by text.
  c_min_questions constant integer := 40;
  v_role text;
  v_permission boolean;
  v_item jsonb;
  v_correct integer;
  v_selected integer;
  v_score integer := 0;
  v_total integer := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  SELECT role, test_permission INTO v_role, v_permission
  FROM public.profiles WHERE id = auth.uid()
  FOR UPDATE;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_role IN ('admin', 'teacher') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT coalesce(v_permission, false) THEN
    RAISE EXCEPTION 'test_not_permitted';
  END IF;
  IF NEW.mode IS DISTINCT FROM 'exam' THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;
  IF NEW.details IS NULL OR jsonb_typeof(NEW.details -> 'questions') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid_details';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(NEW.details -> 'questions') LOOP
    SELECT q.correct INTO v_correct FROM public.questions q WHERE q.id = (v_item ->> 'id')::integer;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'unknown_question';
    END IF;
    v_selected := CASE WHEN jsonb_typeof(v_item -> 'selected') = 'number' THEN (v_item ->> 'selected')::integer END;
    v_total := v_total + 1;
    IF v_selected = v_correct THEN
      v_score := v_score + 1;
    END IF;
    v_items := v_items || jsonb_build_array(v_item || jsonb_build_object('correct', v_correct));
  END LOOP;

  IF v_total < c_min_questions THEN
    RAISE EXCEPTION 'too_few_questions';
  END IF;
  IF (SELECT count(DISTINCT value ->> 'id') FROM jsonb_array_elements(NEW.details -> 'questions')) <> v_total THEN
    RAISE EXCEPTION 'duplicate_questions';
  END IF;

  NEW.score := v_score;
  NEW.total := v_total;
  -- Same rule as the UI: Math.round(percentage) >= 75, and a terminated test never passes.
  NEW.passed := coalesce(NEW.passed, false) AND round(v_score * 100.0 / v_total) >= 75;
  NEW.details := jsonb_set(NEW.details, '{questions}', v_items);
  NEW.created_at := now();

  UPDATE public.profiles SET test_permission = false WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_test_score ON public.test_scores;
CREATE TRIGGER enforce_test_score
BEFORE INSERT ON public.test_scores
FOR EACH ROW EXECUTE FUNCTION public.enforce_test_score();

REVOKE UPDATE, DELETE ON public.test_scores FROM authenticated;
GRANT INSERT, SELECT ON public.test_scores TO authenticated;
REVOKE ALL ON public.test_scores FROM anon;

-- 6. Email verification codes (api service only, via service_role) ------------
CREATE TABLE IF NOT EXISTS public.email_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  code_hash text NOT NULL,
  ip text,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_codes_email_created ON public.email_codes (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_codes_ip_created ON public.email_codes (ip, created_at DESC);
ALTER TABLE public.email_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_codes FROM anon, authenticated;
GRANT ALL ON public.email_codes TO service_role;

-- 7. Applications: submitted only through submit_application() ----------------
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
CREATE SEQUENCE IF NOT EXISTS public.application_number_seq;

DROP POLICY IF EXISTS "Anyone can insert applications" ON public.applications;
REVOKE INSERT ON public.applications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_application(p jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p ->> 'email'));
  v_code_id uuid;
  v_number text;
BEGIN
  IF coalesce(trim(p ->> 'lname'), '') = '' OR coalesce(trim(p ->> 'fname'), '') = ''
     OR coalesce(v_email, '') = '' OR coalesce(trim(p ->> 'phone'), '') = ''
     OR coalesce(p ->> 'birthdate', '') = '' THEN
    RAISE EXCEPTION 'missing_required_fields';
  END IF;

  -- The email must have been confirmed with a code in the last hour; each code is single-use.
  SELECT id INTO v_code_id
  FROM public.email_codes
  WHERE email = v_email
    AND verified_at IS NOT NULL
    AND used_at IS NULL
    AND verified_at > now() - interval '1 hour'
  ORDER BY verified_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'email_not_verified';
  END IF;
  UPDATE public.email_codes SET used_at = now() WHERE id = v_code_id;

  -- Old numbers were random, so skip any sequence value that is already taken.
  LOOP
    v_number := 'ЗЯ-' || extract(year FROM now())::int || '-' || lpad(nextval('public.application_number_seq')::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.applications WHERE app_number = v_number);
  END LOOP;

  INSERT INTO public.applications (
    app_number, lname, fname, mname, birthdate, phone, email, level, education,
    experience, status, signature_details, email_verified
  ) VALUES (
    v_number,
    trim(p ->> 'lname'),
    trim(p ->> 'fname'),
    nullif(trim(p ->> 'mname'), ''),
    (p ->> 'birthdate')::date,
    trim(p ->> 'phone'),
    v_email,
    coalesce(p ->> 'level', ''),
    coalesce(p ->> 'education', ''),
    coalesce(nullif(p ->> 'experience', '')::integer, 0),
    'pending',
    p -> 'signature_details',
    true
  );

  RETURN v_number;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_application(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(jsonb) TO anon, authenticated;

-- 8. Certificate numbers from a sequence (admin only) -------------------------
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq;

CREATE OR REPLACE FUNCTION public.next_certificate_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number text;
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  LOOP
    v_number := 'СС 02136146/' || lpad(nextval('public.certificate_number_seq')::text, 6, '0')
                || '-' || to_char(now(), 'YY');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.registry WHERE cert = v_number);
  END LOOP;
  RETURN v_number;
END;
$$;
REVOKE ALL ON FUNCTION public.next_certificate_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_certificate_number() TO authenticated;

-- 9. Anonymous visitors cannot write anywhere else ----------------------------
REVOKE INSERT ON public.profiles, public.questions, public.registry FROM anon;

-- 10. 007_update_cases.sql inserted explicit ids without moving the sequence,
-- so "add case" failed with a duplicate key.
SELECT setval('public.cases_id_seq', coalesce((SELECT max(id) FROM public.cases), 0) + 1, false);
