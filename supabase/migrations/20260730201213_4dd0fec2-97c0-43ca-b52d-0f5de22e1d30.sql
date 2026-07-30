-- 1) profiles: stop exposing referral_code publicly (column-level grants)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) skill_experiments: restrict reads to admins and package authors
DROP POLICY IF EXISTS "experiments readable" ON public.skill_experiments;
CREATE POLICY "experiments readable by admins and authors"
  ON public.skill_experiments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = skill_experiments.package_id
        AND p.author_id = auth.uid()
    )
  );
REVOKE SELECT ON public.skill_experiments FROM anon;