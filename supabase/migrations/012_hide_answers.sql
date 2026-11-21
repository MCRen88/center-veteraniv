-- Migration 012: candidates must not be able to read the correct answers.
-- * questions.correct / explanation are readable only by admins and teachers
--   (column privileges + get_questions_full()).
-- * applications.passport: the form collected it, but it was never stored.
-- * The behaviour profile of an exam is derived from server-verified data in the
--   UI; a profile sent by a candidate is dropped.

-- 1. Column-level access to questions ----------------------------------------
REVOKE SELECT ON public.questions FROM anon, authenticated;
GRANT SELECT (id, cat_id, cat_name, question, options) ON public.questions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_questions_full()
RETURNS SETOF public.questions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('admin', 'teacher') OR get_user_role() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.questions ORDER BY id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_questions_full() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_questions_full() TO authenticated;

-- 2. Exam trigger: same as 011, plus drop a client-supplied behaviour profile --
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
  NEW.passed := coalesce(NEW.passed, false)
                AND NOT coalesce((NEW.details ->> 'terminated')::boolean, false)
                AND round(v_score * 100.0 / v_total) >= 75;
  NEW.details := jsonb_set(NEW.details - 'behaviorProfile', '{questions}', v_items);
  NEW.created_at := now();

  UPDATE public.profiles SET test_permission = false WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- 3. Passport / ID number was collected by the form but never stored ------------
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS passport text;

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
    app_number, lname, fname, mname, birthdate, passport, phone, email, level, education,
    experience, status, signature_details, email_verified
  ) VALUES (
    v_number,
    trim(p ->> 'lname'),
    trim(p ->> 'fname'),
    nullif(trim(p ->> 'mname'), ''),
    (p ->> 'birthdate')::date,
    nullif(trim(p ->> 'passport'), ''),
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

INSERT INTO public.app_migrations (name) VALUES ('012_hide_answers.sql') ON CONFLICT (name) DO NOTHING;
