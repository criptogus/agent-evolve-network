-- Follow-up to drizzle/0001_harden_selected_security_findings.sql, already applied by Lovable.
-- Self-reported telemetry must not manufacture verified trust.
ALTER TABLE public.skill_executions ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.skill_executions.is_verified IS 'Only a trusted server evaluator may attest a run. Public/MCP telemetry is always unverified.';
CREATE OR REPLACE FUNCTION public.get_skill_trust(_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT id, slug, latest_version INTO pkg FROM public.packages WHERE slug = _slug AND is_published AND review_status='approved' LIMIT 1;
  IF pkg.id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*) FILTER (WHERE true), count(*) FILTER (WHERE success)
    INTO total_life, ok_life
    FROM public.skill_executions WHERE package_slug = _slug AND is_verified;

  SELECT count(*), count(*) FILTER (WHERE success),
         percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms),
         percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
    INTO total_30, ok_30, p50_30, p95_30
    FROM public.skill_executions
    WHERE package_slug = _slug AND is_verified AND created_at > now() - interval '30 days';

  SELECT count(*), count(*) FILTER (WHERE success)
    INTO total_7, ok_7
    FROM public.skill_executions
    WHERE package_slug = _slug AND is_verified AND created_at > now() - interval '7 days';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'model', m.model, 'runs', m.runs, 'success_rate', m.sr
  ) ORDER BY m.runs DESC), '[]'::jsonb) INTO models_json
  FROM (
    SELECT model AS model, count(*) AS runs,
           (count(*) FILTER (WHERE success))::numeric / greatest(count(*),1) AS sr
    FROM public.skill_executions
    WHERE package_slug = _slug AND is_verified AND created_at > now() - interval '30 days'
    GROUP BY model
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
    'trust_score', CASE WHEN total_30 > 0 THEN trust ELSE NULL END,
    'evidence', 'verified_server_evaluations',
    'battle_tested', battle,
    'lifetime', jsonb_build_object('runs', total_life, 'success_rate', case when total_life>0 then round((ok_life::numeric/total_life)::numeric, 3) else null end),
    'window_30d', jsonb_build_object('runs', total_30, 'success_rate', case when total_30>0 then round((ok_30::numeric/total_30)::numeric, 3) else null end, 'p50_latency_ms', p50_30, 'p95_latency_ms', p95_30),
    'window_7d', jsonb_build_object('runs', total_7, 'success_rate', case when total_7>0 then round((ok_7::numeric/total_7)::numeric, 3) else null end),
    'models', models_json,
    'findings_public', findings_public,
    'findings_critical', findings_critical
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.recompute_trust_scores_v2()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  affected int := 0;
begin
  with adv as (
    select package_id,
           sum(passed)::numeric                 as adv_succ,
           sum(total)::numeric                  as adv_total,
           avg(severity_weighted_score)::numeric as adv_weighted,
           max(total)::numeric                  as case_count,
           extract(epoch from (now() - max(created_at))) / 86400 as last_verified_days
    from public.adversarial_runs
    group by package_id
  ),
  perf as (
    select package_id,
           count(*) filter (where success)::numeric as rw_succ,
           count(*)::numeric                        as rw_total
    from public.skill_executions
    where is_verified AND created_at >= now() - interval '30 days'
      and package_id is not null
    group by package_id
  ),
  releases as (
    select package_id, count(*)::int as signed_releases
    from public.package_releases group by package_id
  ),
  pkg as (
    select p.id,
           coalesce(adv.adv_succ, 0)            as adv_succ,
           coalesce(adv.adv_total, 0)           as adv_total,
           coalesce(adv.adv_weighted, 0)        as adv_weighted,
           coalesce(adv.case_count, 0)          as case_count,
           adv.last_verified_days               as last_verified_days,
           coalesce(perf.rw_succ, 0)            as rw_succ,
           coalesce(perf.rw_total, 0)           as rw_total,
           coalesce(releases.signed_releases, 0) as signed_releases,
           extract(epoch from (now() - p.created_at)) / 86400 as age_days
    from public.packages p
    left join adv      on adv.package_id      = p.id
    left join perf     on perf.package_id     = p.id
    left join releases on releases.package_id = p.id
  ),
  dims as (
    select id, adv_succ, adv_total, adv_weighted, case_count, last_verified_days,
           rw_succ, rw_total, signed_releases, age_days,
           ( 0.6 * public.wilson_lower_bound(adv_succ, adv_total)
           + 0.4 * least(1, greatest(0, adv_weighted)) * least(1, adv_total / 8.0)
           ) as safety,
           public.wilson_lower_bound(rw_succ, rw_total) as competence,
           ( 0.7 * (case
                      when last_verified_days is null then 0
                      when last_verified_days <= 30 then 1
                      when last_verified_days >= 180 then 0
                      else 1 - (last_verified_days - 30) / 150.0
                    end)
           + 0.3 * least(1, signed_releases / 3.0)
           ) as freshness,
           ( 0.4 * public.trust_saturate(adv_total, 12)
           + 0.25 * public.trust_saturate(case_count, 8)
           + 0.25 * public.trust_saturate(rw_total, 100)
           + 0.10 * least(1, signed_releases / 3.0)
           ) as confidence
    from pkg
  ),
  scored as (
    select id, adv_succ, adv_total, adv_weighted, rw_succ, rw_total,
           signed_releases, age_days, safety, competence, freshness, confidence,
           least(1, greatest(0,
             0.10 * 1
           + 0.45 * safety
           + 0.30 * competence
           + 0.15 * freshness
           )) as raw_quality,
           (adv_total >= 8 and case_count >= 5) as verified
    from dims
  )
  insert into public.package_trust_scores
    (package_id, score, schema_valid, adversarial_pass_rate,
     adversarial_weighted_score, real_world_success_rate,
     signed_releases, age_days, trust_version, confidence, verified,
     dim_safety, dim_competence, dim_freshness, dim_coverage, components, computed_at)
  select id,
         round((raw_quality * confidence)::numeric, 4),
         true,
         round(public.wilson_lower_bound(adv_succ, adv_total)::numeric, 4),
         round(least(1, greatest(0, adv_weighted))::numeric, 4),
         round(public.wilson_lower_bound(rw_succ, rw_total)::numeric, 4),
         signed_releases, age_days::int,
         '2.0.0',
         round(confidence::numeric, 4),
         verified,
         round(safety::numeric, 4),
         round(competence::numeric, 4),
         round(freshness::numeric, 4),
         round(confidence::numeric, 4),
         jsonb_build_object(
           'version', '2.0.0',
           'safety', round(safety::numeric, 4),
           'competence', round(competence::numeric, 4),
           'freshness', round(freshness::numeric, 4),
           'confidence', round(confidence::numeric, 4),
           'verified', verified,
           'adv_runs_cases', adv_total,
           'real_world_runs', rw_total,
           'signed_releases', signed_releases
         ),
         now()
  from scored
  on conflict (package_id) do update set
    score = excluded.score,
    adversarial_pass_rate = excluded.adversarial_pass_rate,
    adversarial_weighted_score = excluded.adversarial_weighted_score,
    real_world_success_rate = excluded.real_world_success_rate,
    signed_releases = excluded.signed_releases,
    age_days = excluded.age_days,
    trust_version = excluded.trust_version,
    confidence = excluded.confidence,
    verified = excluded.verified,
    dim_safety = excluded.dim_safety,
    dim_competence = excluded.dim_competence,
    dim_freshness = excluded.dim_freshness,
    dim_coverage = excluded.dim_coverage,
    components = excluded.components,
    computed_at = excluded.computed_at;

  get diagnostics affected = row_count;
  return affected;
end;
$function$
;
REVOKE EXECUTE ON FUNCTION public.recompute_trust_scores_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_trust_scores_v2() TO service_role;
CREATE OR REPLACE FUNCTION public.snapshot_package_weekly_metrics()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  affected int := 0;
  wk date := date_trunc('week', now() - interval '7 days')::date;
begin
  insert into public.package_weekly_metrics
    (package_id, package_slug, week_start, track, runs, successes, success_rate,
     success_rate_wilson_lb, task_completed_rate, p95_latency_ms, avg_tokens,
     adversarial_pass_rate, adversarial_weighted, trust_score)
  select
    p.id, p.slug, wk, 'current',
    coalesce(x.runs, 0), coalesce(x.successes, 0),
    x.success_rate,
    public.wilson_lower_bound(coalesce(x.successes,0)::bigint, coalesce(x.runs,0)::bigint),
    x.task_completed_rate, x.p95, x.avg_tokens,
    adv.pass_rate, adv.weighted, ts.score
  from public.packages p
  left join lateral (
    select count(*) as runs,
           count(*) filter (where e.success) as successes,
           (count(*) filter (where e.success))::numeric / nullif(count(*),0) as success_rate,
           (count(*) filter (where e.task_completed))::numeric
             / nullif(count(*) filter (where e.task_completed is not null),0) as task_completed_rate,
           percentile_cont(0.95) within group (order by e.latency_ms) as p95,
           avg(coalesce(e.tokens_in,0) + coalesce(e.tokens_out,0)) as avg_tokens
    from public.skill_executions e
    where e.is_verified AND e.package_id = p.id
      and e.created_at >= wk and e.created_at < wk + interval '7 days'
      and (e.arm is null or e.arm = 'treatment')
  ) x on true
  left join lateral (
    select avg(r.pass_rate)::numeric(5,4) as pass_rate,
           avg(r.severity_weighted_score)::numeric(5,4) as weighted
    from public.adversarial_runs r
    where r.package_id = p.id and r.subject_arm = 'certified'
      and r.created_at >= wk and r.created_at < wk + interval '7 days'
  ) adv on true
  left join public.package_trust_scores ts on ts.package_id = p.id
  where p.is_published = true
  on conflict (package_id, week_start, track) do update set
    runs = excluded.runs,
    successes = excluded.successes,
    success_rate = excluded.success_rate,
    success_rate_wilson_lb = excluded.success_rate_wilson_lb,
    task_completed_rate = excluded.task_completed_rate,
    p95_latency_ms = excluded.p95_latency_ms,
    avg_tokens = excluded.avg_tokens,
    adversarial_pass_rate = excluded.adversarial_pass_rate,
    adversarial_weighted = excluded.adversarial_weighted,
    trust_score = excluded.trust_score;
  get diagnostics affected = row_count;

  insert into public.package_weekly_metrics
    (package_id, package_slug, week_start, track,
     adversarial_pass_rate, adversarial_weighted)
  select r.package_id, p.slug, wk, 'frozen_v1',
         avg(r.pass_rate)::numeric(5,4), avg(r.severity_weighted_score)::numeric(5,4)
  from public.adversarial_runs r
  join public.packages p on p.id = r.package_id
  where r.subject_arm = 'frozen_v1'
    and r.created_at >= wk and r.created_at < wk + interval '7 days'
  group by r.package_id, p.slug
  on conflict (package_id, week_start, track) do update set
    adversarial_pass_rate = excluded.adversarial_pass_rate,
    adversarial_weighted = excluded.adversarial_weighted;

  return affected;
end;
$function$
;
REVOKE EXECUTE ON FUNCTION public.snapshot_package_weekly_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_package_weekly_metrics() TO service_role;
ALTER FUNCTION public.get_credit_balance(uuid) SECURITY INVOKER;
ALTER FUNCTION public.has_active_subscription(uuid) SECURITY INVOKER;
ALTER FUNCTION public.has_active_subscription(uuid,text) SECURITY INVOKER;
DROP POLICY IF EXISTS "pack_cust insert own purchased" ON public.pack_customizations;
CREATE POLICY "pack_cust insert own purchased" ON public.pack_customizations FOR INSERT TO authenticated
WITH CHECK(user_id=auth.uid() AND status='queued' AND items='[]'::jsonb AND EXISTS(
 SELECT 1 FROM public.pack_purchases p WHERE p.pack_id=pack_customizations.pack_id AND p.buyer_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.check_security_boundaries()
 RETURNS TABLE(check_name text, passed boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
WITH server_functions(signature) AS (VALUES ('public.crm_active_hours(uuid)'),
('public.crm_activity_hours(uuid,integer)'),
('public.crm_customers(integer,integer,uuid)'),
('public.crm_effectiveness(integer)'),
('public.crm_effectiveness_by_segment(integer)'),
('public.crm_segment_send_hour_stats(integer)'),
('public.crm_send_hour_stats(integer)'),
('public.crm_track_click(text)'),
('public.crm_track_open(text)'),
('public.delete_email(text,bigint)'),
('public.enqueue_email(text,jsonb)'),
('public.get_pack_with_items(text)'),
('public.get_package_ratings(uuid)'),
('public.list_package_reviews(uuid,integer)'),
('public.mcp_idempotency_get(uuid,text,text)'),
('public.mcp_idempotency_put(uuid,text,text,jsonb)'),
('public.mcp_oauth_exchange_code(text,text,text,text,text,integer,integer)'),
('public.mcp_oauth_get_client(text)'),
('public.mcp_oauth_refresh_token(text,text,text,text,integer,integer)'),
('public.mcp_oauth_register_client(text,text[],text,text,text,text,text)'),
('public.mcp_oauth_revoke_token(text)'),
('public.mcp_oauth_verify_access(text)'),
('public.move_to_dlq(text,text,bigint,jsonb)'),
('public.read_email_batch(text,integer,integer)'),('public.compute_skill_drift(uuid,integer)'),('public.mcp_check_and_log_call(uuid,text,text,boolean)'),('public.report_skill_execution(text,boolean,text,text,integer,integer,integer,text,text,text,text,boolean,boolean,smallint,integer,integer,text)'),('public.recompute_trust_scores_v2()'),('public.snapshot_package_weekly_metrics()'))
SELECT 'server_rpc_acl', count(*) = 29 AND bool_and(
  NOT pg_catalog.has_function_privilege('anon', signature, 'EXECUTE') AND
  NOT pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE') AND
  pg_catalog.has_function_privilege('service_role', signature, 'EXECUTE')) FROM server_functions
UNION ALL
SELECT 'email_search_path', count(*) = 4 AND bool_and(p.proconfig @> ARRAY['search_path=""'])
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('enqueue_email','read_email_batch','delete_email','move_to_dlq')
UNION ALL
SELECT 'rls_invoker_reads', count(*) = 3 AND bool_and(NOT p.prosecdef)
FROM pg_catalog.pg_proc p WHERE p.oid IN ('public.agent_onboarding_funnel(integer)'::pg_catalog.regprocedure,'public.search_packages(text,text,integer,integer)'::pg_catalog.regprocedure,'public.get_review_eligibility(uuid)'::pg_catalog.regprocedure)
UNION ALL
SELECT 'authenticated_transactions', count(*) = 7 AND bool_and(
 NOT pg_catalog.has_function_privilege('anon', signature, 'EXECUTE') AND
 pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE'))
FROM (VALUES ('public.claim_referral(text,text,text)'),('public.purchase_pack(uuid)'),('public.purchase_package(uuid)'),('public.team_action(text,uuid,jsonb)'),('public.mcp_oauth_issue_code(text,text,text,text,text,text,integer)'),('public.mcp_oauth_list_user_connections()'),('public.mcp_oauth_revoke_client_for_user(text)')) f(signature)
UNION ALL
SELECT 'plans_explicit_public_rows', count(*) = 1 AND bool_and(qual <> 'true' AND qual LIKE '%slug%')
FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans public read'
UNION ALL SELECT 'account_reads_invoker', count(*)=3 AND bool_and(NOT p.prosecdef)
 FROM pg_catalog.pg_proc p WHERE p.oid IN ('public.get_credit_balance(uuid)'::pg_catalog.regprocedure,'public.has_active_subscription(uuid)'::pg_catalog.regprocedure,'public.has_active_subscription(uuid,text)'::pg_catalog.regprocedure)
UNION ALL SELECT 'verified_telemetry_only', count(*)=3 AND bool_and(pg_catalog.pg_get_functiondef(p.oid) LIKE '%is_verified%')
 FROM pg_catalog.pg_proc p WHERE p.oid IN ('public.get_skill_trust(text)'::pg_catalog.regprocedure,'public.recompute_trust_scores_v2()'::pg_catalog.regprocedure,'public.snapshot_package_weekly_metrics()'::pg_catalog.regprocedure)
UNION ALL SELECT 'customization_purchase_required', count(*)=1 AND bool_and(with_check LIKE '%pack_purchases%' AND with_check LIKE '%queued%')
 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='pack_customizations' AND cmd='INSERT';
$function$
;
-- Refresh cached scores after excluding unverified reports.
SELECT public.recompute_trust_scores_v2();

