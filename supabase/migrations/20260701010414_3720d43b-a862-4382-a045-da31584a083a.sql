-- Fix privilege escalation on insert policies: enforce ownership in WITH CHECK
DROP POLICY IF EXISTS "packages author insert" ON public.packages;
CREATE POLICY "packages author insert" ON public.packages
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "learnings auth insert" ON public.learnings;
CREATE POLICY "learnings auth insert" ON public.learnings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "requests insert auth" ON public.package_requests;
CREATE POLICY "requests insert auth" ON public.package_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
