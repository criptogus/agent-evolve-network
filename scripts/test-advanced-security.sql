-- Transactional probes only: synthetic identities, no emails or charges.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01','security-owner@example.invalid','{}'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddd02','security-other@example.invalid','{}');
INSERT INTO public.user_roles(user_id,role) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddd02','admin');
SELECT set_config('request.jwt.claims','{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddd02","role":"authenticated"}',true);
INSERT INTO public.packages(id,slug,name,type,description,author_id,is_published,review_status)
 VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03','security-rollback-fixture','Fixture','skill','Rollback only','eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',true,'approved');
INSERT INTO public.package_versions(package_id,version,system_prompt) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03','0.1.0','Original approved content');
INSERT INTO public.packs(id,slug,name,description,price_credits) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04','security-rollback-pack','Fixture','Rollback only',10);
INSERT INTO public.credit_ledger(user_id,delta,balance_after,reason) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddd02',77,77,'purchase');
INSERT INTO public.team_workspaces(id,name,owner_id) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05','Rollback workspace','dddddddd-dddd-4ddd-8ddd-dddddddddd02');
INSERT INTO public.team_invites(workspace_id,email,role,token_hash,created_by) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05','security-owner@example.invalid','viewer',encode(extensions.digest('rollback-only-token','sha256'),'hex'),'dddddddd-dddd-4ddd-8ddd-dddddddddd02');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated","email":"security-owner@example.invalid"}',true);
DO $test$
DECLARE n int;
BEGIN
 BEGIN
  PERFORM public.team_action('accept',NULL,'{"token":"rollback-only-token"}');
  RAISE EXCEPTION 'Unverified email joined workspace';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.get_credit_balance('dddddddd-dddd-4ddd-8ddd-dddddddddd02') <> 0 THEN RAISE EXCEPTION 'Cross-user credits leaked'; END IF;
 UPDATE public.packages SET star_count=999 WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03';
 IF (SELECT star_count FROM public.packages WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03') <> 0 THEN RAISE EXCEPTION 'Author forged stars'; END IF;
 INSERT INTO public.package_stars(user_id,package_id) VALUES(auth.uid(),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03');
 IF (SELECT star_count FROM public.packages WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03') <> 1 THEN RAISE EXCEPTION 'Legitimate star did not increment'; END IF;
 DELETE FROM public.package_stars WHERE user_id=auth.uid() AND package_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03';
 IF (SELECT star_count FROM public.packages WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03') <> 0 THEN RAISE EXCEPTION 'Legitimate star did not decrement'; END IF;
 UPDATE public.package_versions SET system_prompt='Bypass' WHERE package_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Author changed approved content'; END IF;
 BEGIN
  INSERT INTO public.pack_customizations(user_id,pack_id,brief) VALUES(auth.uid(),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04','Unauthorized customization');
  RAISE EXCEPTION 'Unpurchased customization accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.mcp_check_and_log_call(auth.uid(),'probe','probe',false);
  RAISE EXCEPTION 'User forged MCP log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.compute_skill_drift('eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03');
  RAISE EXCEPTION 'User read private drift';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.report_skill_execution('security-rollback-fixture',true);
  RAISE EXCEPTION 'User called internal telemetry RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT public.report_skill_execution('security-rollback-fixture',true);
DO $test$
BEGIN
 IF (public.get_skill_trust('security-rollback-fixture')->>'trust_score') IS NOT NULL THEN RAISE EXCEPTION 'Unverified telemetry inflated trust'; END IF;
 IF (public.get_skill_trust('security-rollback-fixture')->>'battle_tested')::boolean THEN RAISE EXCEPTION 'Unverified battle badge'; END IF;
END $test$;
RESET ROLE;
UPDATE auth.users SET confirmation_sent_at=now()-interval '1 minute',email_confirmed_at=now() WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated","email":"security-owner@example.invalid"}',true);
SELECT public.team_action('accept',NULL,'{"token":"rollback-only-token"}');
RESET ROLE;
ROLLBACK;
SELECT 'passed' AS advanced_security_role_probes;
