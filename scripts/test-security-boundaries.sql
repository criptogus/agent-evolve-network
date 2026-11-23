-- Run after the migration in a transaction. All probes are rolled back.
BEGIN;
INSERT INTO public.plans(slug,name) VALUES ('security-private-probe-20261123','Security rollback fixture');
DO $test$
DECLARE failures text;
BEGIN
 SELECT string_agg(check_name, ', ') INTO failures FROM public.check_security_boundaries() WHERE passed IS DISTINCT FROM true;
 IF failures IS NOT NULL OR (SELECT count(*) FROM public.check_security_boundaries()) <> 8 THEN
   RAISE EXCEPTION 'Security boundary regression: %', failures;
 END IF;
END $test$;
SET LOCAL ROLE anon;
DO $test$
BEGIN
 BEGIN
  PERFORM public.crm_customers(1,0,NULL);
  RAISE EXCEPTION 'Anonymous CRM call succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.enqueue_email('security_probe', '{}'::jsonb);
  RAISE EXCEPTION 'Anonymous email enqueue succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.plans WHERE slug NOT IN ('free','pro','enterprise','unlimited')) THEN
  RAISE EXCEPTION 'Internal plans exposed';
 END IF;
 PERFORM * FROM public.search_packages('security',NULL,1,0);
 IF public.get_review_eligibility('00000000-0000-0000-0000-000000000000')->>'authenticated' <> 'false' THEN
  RAISE EXCEPTION 'Anonymous eligibility changed';
 END IF;
END $test$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
DO $test$
BEGIN
 BEGIN
  PERFORM public.crm_customers(1,0,NULL);
  RAISE EXCEPTION 'Ordinary user CRM call succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.mcp_oauth_get_client('security_probe');
  RAISE EXCEPTION 'Ordinary user OAuth internal call succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.agent_onboarding_funnel(1)) THEN
  RAISE EXCEPTION 'Non-admin received onboarding statistics';
 END IF;
 BEGIN
  PERFORM public.team_action('invite','00000000-0000-0000-0000-000000000000','{}');
  RAISE EXCEPTION 'Non-member team action succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.get_review_eligibility('00000000-0000-0000-0000-000000000000')->>'can_review' <> 'false' THEN
  RAISE EXCEPTION 'Unknown package eligibility changed';
 END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
DO $test$
BEGIN
 PERFORM public.mcp_oauth_get_client('security_probe_nonexistent');
 PERFORM public.mcp_idempotency_get('00000000-0000-0000-0000-000000000000','security_probe','probe');
 PERFORM public.get_pack_with_items('security_probe_nonexistent');
 IF public.delete_email('security_probe_nonexistent',-1) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Email queue missing-table behavior changed';
 END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'passed' AS security_role_probes;

