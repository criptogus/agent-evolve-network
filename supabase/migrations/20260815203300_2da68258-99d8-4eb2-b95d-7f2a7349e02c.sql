DROP POLICY IF EXISTS "enterprise_requests_insert_anyone" ON public.enterprise_requests;
REVOKE INSERT ON public.enterprise_requests FROM anon;
REVOKE INSERT ON public.enterprise_requests FROM authenticated;
GRANT ALL ON public.enterprise_requests TO service_role;

DROP POLICY IF EXISTS "share_promos public read" ON public.share_promos;
REVOKE SELECT ON public.share_promos FROM anon;
REVOKE SELECT ON public.share_promos FROM authenticated;
GRANT ALL ON public.share_promos TO service_role;

REVOKE SELECT ON public.adversarial_cases FROM anon;
GRANT ALL ON public.adversarial_cases TO service_role;