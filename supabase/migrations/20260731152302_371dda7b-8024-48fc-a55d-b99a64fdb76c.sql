DROP POLICY IF EXISTS "no direct select on upload jobs" ON public.package_upload_jobs;

CREATE POLICY "owners can read their own upload jobs"
ON public.package_upload_jobs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

GRANT SELECT (id, user_id, filename, inferred_type, status, attempts, result, error, package_id, slug, created_at, started_at, finished_at) ON public.package_upload_jobs TO authenticated;
GRANT ALL ON public.package_upload_jobs TO service_role;