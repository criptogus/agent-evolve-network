-- 1. Add admin SELECT policy for adversarial_runs
CREATE POLICY "adversarial_runs admin read"
  ON public.adversarial_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add admin SELECT policy for upload_injection_audit
CREATE POLICY "upload_injection_audit admin read"
  ON public.upload_injection_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add user self-select policy for skill_executions
CREATE POLICY "skill_executions self read"
  ON public.skill_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Tighten skill_compatibility public read to require approved status
DROP POLICY IF EXISTS "compat public read" ON public.skill_compatibility;
CREATE POLICY "compat public read"
  ON public.skill_compatibility FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = skill_compatibility.package_id
        AND p.is_published
        AND p.review_status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = skill_compatibility.package_id
        AND (p.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 5. Tighten package_evaluations public read to require approved status
DROP POLICY IF EXISTS "evaluations public read" ON public.package_evaluations;
CREATE POLICY "evaluations public read"
  ON public.package_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_evaluations.package_id
        AND (
          (p.is_published AND p.review_status = 'approved')
          OR p.author_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );