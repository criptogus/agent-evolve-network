DROP POLICY IF EXISTS "owners read own upload jobs" ON public.package_upload_jobs;

CREATE POLICY "no direct select on upload jobs"
  ON public.package_upload_jobs
  FOR SELECT
  USING (false);

CREATE OR REPLACE VIEW public.package_upload_jobs_safe
WITH (security_invoker = on) AS
SELECT
  id, user_id, filename, inferred_type, status, attempts, result, error,
  package_id, slug, created_at, started_at, finished_at
FROM public.package_upload_jobs
WHERE auth.uid() = user_id;

GRANT SELECT ON public.package_upload_jobs_safe TO authenticated;