-- Private probability evidence only. No briefs, candidate text, credentials,
-- generated answers, permissions or approval decisions are stored.
CREATE TABLE public.agent_match_selection_cache (
  scope_hash text NOT NULL CHECK (scope_hash ~ '^[a-f0-9]{64}$'),
  cache_key text NOT NULL CHECK (cache_key ~ '^[a-f0-9]{64}$'),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope_hash, cache_key),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 minutes')
);
ALTER TABLE public.agent_match_selection_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_match_selection_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_match_selection_cache TO service_role;
CREATE POLICY "Server-only selection evidence" ON public.agent_match_selection_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.read_agent_match_selection_cache(p_scope_hash text, p_cache_key text)
RETURNS TABLE(evidence jsonb, age_ms integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF coalesce(p_scope_hash, '') !~ '^[a-f0-9]{64}$'
     OR coalesce(p_cache_key, '') !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid cache identity';
  END IF;
  RETURN QUERY SELECT c.evidence,
    floor(extract(epoch FROM (clock_timestamp() - c.created_at)) * 1000)::integer
  FROM public.agent_match_selection_cache c
  WHERE c.scope_hash = p_scope_hash AND c.cache_key = p_cache_key
    AND c.created_at <= clock_timestamp() AND c.expires_at > clock_timestamp();
END;
$$;

CREATE FUNCTION public.write_agent_match_selection_cache(
  p_scope_hash text, p_cache_key text, p_evidence jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  at_time timestamptz := clock_timestamp();
  field_name text;
BEGIN
  IF coalesce(p_scope_hash, '') !~ '^[a-f0-9]{64}$'
     OR coalesce(p_cache_key, '') !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid cache evidence';
  END IF;
  IF ARRAY(SELECT jsonb_object_keys(p_evidence) ORDER BY 1)
      IS DISTINCT FROM ARRAY['inputTokens','model','outputTokens','probabilities','requests']
     OR p_evidence->>'model' IS DISTINCT FROM 'jev-1.14.0'
     OR jsonb_typeof(p_evidence->'probabilities') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid cache evidence';
  END IF;
  IF jsonb_array_length(p_evidence->'probabilities') NOT BETWEEN 1 AND 800
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_evidence->'probabilities') value
       WHERE CASE WHEN jsonb_typeof(value) = 'number'
         THEN (value::text)::numeric < 0 OR (value::text)::numeric > 1 ELSE true END) THEN
    RAISE EXCEPTION 'Invalid selection probabilities';
  END IF;
  FOREACH field_name IN ARRAY ARRAY['inputTokens','outputTokens','requests'] LOOP
    IF jsonb_typeof(p_evidence->field_name) IS DISTINCT FROM 'number'
       OR coalesce(p_evidence->>field_name, '') !~ '^[0-9]+$'
       OR (p_evidence->>field_name)::numeric > 9007199254740991 THEN
      RAISE EXCEPTION 'Invalid selection usage';
    END IF;
  END LOOP;
  IF (p_evidence->>'requests')::integer NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Missing or unbounded selection requests';
  END IF;
  -- Keep the original global 64-entry bound, serialized across workers.
  PERFORM pg_advisory_xact_lock(hashtextextended('agent-match-selection-cache-v1', 0));
  DELETE FROM public.agent_match_selection_cache WHERE expires_at <= at_time;
  INSERT INTO public.agent_match_selection_cache(scope_hash,cache_key,evidence,created_at,expires_at)
    VALUES(p_scope_hash,p_cache_key,p_evidence,at_time,at_time + interval '30 minutes')
    ON CONFLICT (scope_hash,cache_key) DO NOTHING;
  -- Concurrent writers cannot replace the first evidence or extend its expiry.
  DELETE FROM public.agent_match_selection_cache WHERE (scope_hash,cache_key) IN (
    SELECT c.scope_hash,c.cache_key FROM public.agent_match_selection_cache c
      ORDER BY c.created_at DESC,c.scope_hash,c.cache_key OFFSET 64
  );
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.read_agent_match_selection_cache(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_agent_match_selection_cache(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_agent_match_selection_cache(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.write_agent_match_selection_cache(text,text,jsonb) TO service_role;
