
-- report_leads: validate inserts
DROP POLICY IF EXISTS "leads public insert" ON public.report_leads;
CREATE POLICY "leads authenticated insert"
ON public.report_leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND email_domain IS NOT NULL
  AND length(email_domain) BETWEEN 3 AND 255
  AND company IS NOT NULL AND length(company) <= 200
  AND role IS NOT NULL AND length(role) <= 100
  AND length(coalesce(prompt,'')) <= 4000
  AND length(coalesce(governance,'')) <= 4000
);

-- learnings: restrict reads to owner/author/admin
DROP POLICY IF EXISTS "learnings public read" ON public.learnings;
CREATE POLICY "learnings owner author admin read"
ON public.learnings
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = learnings.package_id AND p.author_id = auth.uid()
  )
);

-- package_installs: restrict reads to owner/admin
DROP POLICY IF EXISTS "installs read all" ON public.package_installs;
CREATE POLICY "installs self read"
ON public.package_installs
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- reviews: hide moderated reviews from public
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read"
ON public.reviews
FOR SELECT
USING (
  is_hidden = false
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- package_versions: also require approved review_status for public reads
DROP POLICY IF EXISTS "versions read public" ON public.package_versions;
CREATE POLICY "versions read public"
ON public.package_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_versions.package_id
    AND (
      (p.is_published AND p.review_status = 'approved')
      OR p.author_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Pin search_path on functions missing it
CREATE OR REPLACE FUNCTION public.tg_user_mcp_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.next_sas_code()
RETURNS text
LANGUAGE sql
SET search_path TO 'public'
AS $function$
  SELECT 'SAS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.sas_finding_seq')::text, 4, '0')
$function$;
