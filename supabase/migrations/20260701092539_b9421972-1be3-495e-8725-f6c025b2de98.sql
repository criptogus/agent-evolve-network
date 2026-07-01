CREATE OR REPLACE FUNCTION public.get_skill_trust(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pkg RECORD;
  total_life int := 0;
  ok_life int := 0;
  total_30 int := 0;
  ok_30 int := 0;
  p50_30 numeric := NULL;
  p95_30 numeric := NULL;
  total_7 int := 0;
  ok_7 int := 0;
  models_json jsonb := '[]'::jsonb;
  findings_public int := 0;
  findings_critical int := 0;
  trust numeric := NULL;
  battle boolean := false;
BEGIN
  SELECT id, slug, latest_version INTO pkg FROM public.packages WHERE slug = _slug LIMIT 1;
  IF pkg.id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*) FILTER (WHERE true), count(*) FILTER (WHERE success)
    INTO total_life, ok_life
    FROM public.skill_executions WHERE package_slug = _slug;

  SELECT count(*), count(*) FILTER (WHERE success),
         percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms),
         percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
    INTO total_30, ok_30, p50_30, p95_30
    FROM public.skill_executions
    WHERE package_slug = _slug AND created_at > now() - interval '30 days';

  SELECT count(*), count(*) FILTER (WHERE success)
    INTO total_7, ok_7
    FROM public.skill_executions
    WHERE package_slug = _slug AND created_at > now() - interval '7 days';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'model', m.model, 'runs', m.runs, 'success_rate', m.sr
  ) ORDER BY m.runs DESC), '[]'::jsonb) INTO models_json
  FROM (
    SELECT model_id AS model, count(*) AS runs,
           (count(*) FILTER (WHERE success))::numeric / greatest(count(*),1) AS sr
    FROM public.skill_executions
    WHERE package_slug = _slug AND created_at > now() - interval '30 days'
    GROUP BY model_id
  ) m;

  SELECT count(*), count(*) FILTER (WHERE severity = 'critical')
    INTO findings_public, findings_critical
    FROM public.skill_robustness_findings
    WHERE package_slug = _slug AND status = 'public';

  trust := round(
    (
      (case when total_30 > 0 then (ok_30::numeric/total_30) else 0.5 end) * 100
      * least(1.0, ln(greatest(total_30,1)+1) / ln(101))
      * (1.0 - least(1.0, findings_critical::numeric * 0.25))
    )::numeric,
    1
  );
  battle := total_30 >= 50 AND (ok_30::numeric/greatest(total_30,1)) >= 0.9 AND findings_critical = 0;

  RETURN jsonb_build_object(
    'slug', _slug,
    'trust_score', trust,
    'battle_tested', battle,
    'lifetime', jsonb_build_object('runs', total_life, 'success_rate', case when total_life>0 then round((ok_life::numeric/total_life)::numeric, 3) else null end),
    'window_30d', jsonb_build_object('runs', total_30, 'success_rate', case when total_30>0 then round((ok_30::numeric/total_30)::numeric, 3) else null end, 'p50_latency_ms', p50_30, 'p95_latency_ms', p95_30),
    'window_7d', jsonb_build_object('runs', total_7, 'success_rate', case when total_7>0 then round((ok_7::numeric/total_7)::numeric, 3) else null end),
    'models', models_json,
    'findings_public', findings_public,
    'findings_critical', findings_critical
  );
END;
$$;