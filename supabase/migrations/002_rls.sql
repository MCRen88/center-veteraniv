-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Utility function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. PROFILES RLS
-- Users can read their own profile. Admin and teacher can read all profiles.
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = id OR get_user_role() IN ('admin', 'teacher') );

-- Only admin can update/insert/delete profiles (though insertion might happen via triggers/admin api)
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK ( get_user_role() = 'admin' );

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING ( get_user_role() = 'admin' );

CREATE POLICY "Users can revoke own test permission"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id AND role = 'user' AND test_permission = false );

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING ( get_user_role() = 'admin' );


-- 2. QUESTIONS RLS
-- Anyone authenticated can read questions
CREATE POLICY "Authenticated users can read questions"
ON public.questions FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify questions
CREATE POLICY "Admins can modify questions"
ON public.questions FOR ALL
USING ( get_user_role() = 'admin' );


-- 3. TEST SCORES RLS
-- Users can read their own test scores. Admins and teachers can read all.
CREATE POLICY "Users can read own test scores or admins/teachers can read all"
ON public.test_scores FOR SELECT
USING ( auth.uid() = user_id OR get_user_role() IN ('admin', 'teacher') );

-- Users can insert their own test scores or admins/teachers can insert
CREATE POLICY "Users can insert own test scores or admins/teachers can insert"
ON public.test_scores FOR INSERT
WITH CHECK ( auth.uid() = user_id OR get_user_role() IN ('admin', 'teacher') );


-- 4. REGISTRY RLS
-- Anyone can read registry (including anon users, since it's an open registry)
CREATE POLICY "Anyone can view registry"
ON public.registry FOR SELECT
USING (true);

-- Only admins can modify registry
CREATE POLICY "Admins can modify registry"
ON public.registry FOR ALL
USING ( get_user_role() = 'admin' );


-- 5. APPLICATIONS RLS
-- Anyone (even anon) can insert an application
CREATE POLICY "Anyone can insert applications"
ON public.applications FOR INSERT
WITH CHECK (true);

-- Only admins can read/update/delete applications
CREATE POLICY "Admins can view and manage applications"
ON public.applications FOR ALL
USING ( get_user_role() = 'admin' );
