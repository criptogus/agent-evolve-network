-- All synthetic rows and role changes are rolled back. No inference.
BEGIN;
CREATE TEMP TABLE sas_cache_checks(name text PRIMARY KEY) ON COMMIT DROP;
DO $$
DECLARE
  scope_id text := repeat('1',64);
  key_id text := repeat('2',64);
  sample jsonb := '{"probabilities":[0.98],"model":"jev-1.14.0","requests":1,"inputTokens":472,"outputTokens":21}';
  old_created timestamptz;
  old_expiry timestamptz;
  invalid jsonb;
BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.agent_match_selection_cache'::regclass);
  ASSERT NOT has_table_privilege('anon','public.agent_match_selection_cache','SELECT');
  ASSERT NOT has_table_privilege('authenticated','public.agent_match_selection_cache','INSERT');
  INSERT INTO sas_cache_checks VALUES ('rls_and_private_table_acl');
  ASSERT NOT has_function_privilege('anon','public.read_agent_match_selection_cache(text,text)','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','public.write_agent_match_selection_cache(text,text,jsonb)','EXECUTE');
  INSERT INTO sas_cache_checks VALUES ('private_rpc_acl');
  PERFORM public.write_agent_match_selection_cache(scope_id,key_id,sample);
  ASSERT (SELECT count(*)=1 FROM public.read_agent_match_selection_cache(scope_id,key_id));
  ASSERT (SELECT evidence=sample AND age_ms>=0 AND age_ms<1800000 FROM public.read_agent_match_selection_cache(scope_id,key_id));
  INSERT INTO sas_cache_checks VALUES ('actual_write_read_usage_and_age');
  ASSERT (SELECT count(*)=0 FROM public.read_agent_match_selection_cache(repeat('3',64),key_id));
  INSERT INTO sas_cache_checks VALUES ('scope_partition');
  SELECT created_at,expires_at INTO old_created,old_expiry FROM public.agent_match_selection_cache WHERE scope_hash=scope_id AND cache_key=key_id;
  PERFORM public.write_agent_match_selection_cache(scope_id,key_id,jsonb_set(sample,'{probabilities}','[0.1]'));
  ASSERT (SELECT evidence=sample AND created_at=old_created AND expires_at=old_expiry FROM public.agent_match_selection_cache WHERE scope_hash=scope_id AND cache_key=key_id);
  INSERT INTO sas_cache_checks VALUES ('no_replacement_or_expiry_extension');
  FOR invalid IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    sample || '{"brief":"forbidden"}',
    jsonb_set(sample,'{model}','"other-model"'),
    jsonb_set(sample,'{requests}','0'),
    jsonb_set(sample,'{requests}','21'),
    jsonb_set(sample,'{inputTokens}','1.5'),
    jsonb_set(sample,'{probabilities}','[]'),
    jsonb_set(sample,'{probabilities}','[1.1]'),
    jsonb_set(sample,'{probabilities}','["0.98"]')
  )) LOOP
    BEGIN
      PERFORM public.write_agent_match_selection_cache(scope_id,repeat('4',64),invalid);
      RAISE EXCEPTION 'Invalid evidence unexpectedly stored';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='Invalid evidence unexpectedly stored' THEN RAISE; END IF;
    END;
  END LOOP;
  ASSERT NOT EXISTS(SELECT 1 FROM public.agent_match_selection_cache WHERE scope_hash=scope_id AND cache_key=repeat('4',64));
  INSERT INTO sas_cache_checks VALUES ('reject_invalid_and_private_payloads');
  INSERT INTO public.agent_match_selection_cache VALUES(scope_id,repeat('5',64),sample,statement_timestamp()-interval '31 minutes',statement_timestamp()-interval '1 minute');
  ASSERT (SELECT count(*)=0 FROM public.read_agent_match_selection_cache(scope_id,repeat('5',64)));
  INSERT INTO sas_cache_checks VALUES ('expiry');
  INSERT INTO public.agent_match_selection_cache VALUES(scope_id,repeat('6',64),sample,statement_timestamp()+interval '1 minute',statement_timestamp()+interval '30 minutes');
  ASSERT (SELECT count(*)=0 FROM public.read_agent_match_selection_cache(scope_id,repeat('6',64)));
  INSERT INTO sas_cache_checks VALUES ('reject_future_creation');
  FOR i IN 1..65 LOOP
    PERFORM public.write_agent_match_selection_cache(scope_id,lpad(to_hex(i),64,'0'),sample);
  END LOOP;
  ASSERT (SELECT count(*)=64 FROM public.agent_match_selection_cache);
  ASSERT NOT EXISTS(SELECT 1 FROM public.agent_match_selection_cache WHERE expires_at<=clock_timestamp());
  INSERT INTO sas_cache_checks VALUES ('global_64_entry_bound_and_expiry_cleanup');
END;
$$;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM evidence FROM public.agent_match_selection_cache LIMIT 1;
    RAISE EXCEPTION 'Anon direct read unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.read_agent_match_selection_cache(repeat('1',64),repeat('2',64));
    RAISE EXCEPTION 'Anon RPC unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
INSERT INTO sas_cache_checks VALUES ('actual_anon_table_and_rpc_denials');

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM evidence FROM public.agent_match_selection_cache LIMIT 1;
    RAISE EXCEPTION 'Authenticated direct read unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.write_agent_match_selection_cache(repeat('1',64),repeat('2',64),'{}');
    RAISE EXCEPTION 'Authenticated RPC unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
INSERT INTO sas_cache_checks VALUES ('actual_authenticated_table_and_rpc_denials');

SET LOCAL ROLE service_role;
DO $$ BEGIN
  ASSERT public.write_agent_match_selection_cache(repeat('7',64),repeat('8',64),'{"probabilities":[0.98],"model":"jev-1.14.0","requests":1,"inputTokens":472,"outputTokens":21}');
  ASSERT (SELECT count(*)=1 FROM public.read_agent_match_selection_cache(repeat('7',64),repeat('8',64)));
END; $$;
RESET ROLE;
INSERT INTO sas_cache_checks VALUES ('actual_service_role_write_and_read');
SELECT count(*) AS passed_checks,json_agg(name ORDER BY name) AS checks FROM sas_cache_checks;
ROLLBACK;
