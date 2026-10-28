-- Tighten public.profiles read access: row owner or admins only (was fully public read).
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles owner or admin read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  );
REVOKE SELECT ON public.profiles FROM anon;