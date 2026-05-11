
DROP POLICY IF EXISTS "leads authenticated insert" ON public.report_leads;
CREATE POLICY "leads validated insert"
ON public.report_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND email_domain IS NOT NULL
  AND length(email_domain) BETWEEN 3 AND 255
  AND company IS NOT NULL AND length(company) BETWEEN 1 AND 200
  AND role IS NOT NULL AND length(role) BETWEEN 1 AND 100
  AND length(coalesce(prompt,'')) <= 4000
  AND length(coalesce(governance,'')) <= 4000
  AND stack_size BETWEEN 0 AND 1000
);
