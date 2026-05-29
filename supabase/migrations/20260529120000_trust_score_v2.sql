-- Trust Score v2 — evidence-gated, confidence-aware scoring.
--
-- Replaces the v1 weighted average (which defaulted missing components to 0.5,
-- rewarding absence of evidence) with:
--   * Wilson lower-confidence-bound pass/success rates (small samples pulled
--     toward 0, so a few lucky runs cannot earn a high score);
--   * an explicit confidence factor — score = quality * confidence;
--   * a verified flag (untested packages render "Unverified", not a number);
--   * a freshness term that rewards recent verification instead of raw age;
--   * a published multi-dimensional vector (safety/competence/freshness/coverage).
--
-- Mirrors src/lib/trust/scoring.ts so the score is reproducible offline.
-- See docs/product/EVALUATION-ALGORITHM-ANALYSIS.md.

-- New transparency columns (additive; safe to re-run).
alter table public.package_trust_scores
  add column if not exists trust_version text not null default '2.0.0',
  add column if not exists confidence numeric(5,4),
  add column if not exists verified boolean not null default false,
  add column if not exists dim_safety numeric(5,4),
  add column if not exists dim_competence numeric(5,4),
  add column if not exists dim_freshness numeric(5,4),
  add column if not exists dim_coverage numeric(5,4);

-- Wilson score interval lower bound for a binomial proportion. 0 when no trials.
create or replace function public.wilson_lower_bound(successes numeric, total numeric, z numeric default 1.96)
returns numeric language plpgsql immutable as $$
declare
  p numeric; z2 numeric; denom numeric; center numeric; margin numeric; lb numeric;
begin
  if total is null or total <= 0 then return 0; end if;
  p := successes / total;
  z2 := z * z;
  denom := 1 + z2 / total;
  center := p + z2 / (2 * total);
  margin := z * sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  lb := (center - margin) / denom;
  return greatest(0, least(1, lb));
end;
$$;

-- Saturating curve: n/(n+k), 0 when n<=0.
create or replace function public.trust_saturate(n numeric, k numeric)
returns numeric language sql immutable as $$
  select case when n is null or n <= 0 then 0 else n / (n + k) end;
$$;

create or replace function public.recompute_trust_scores_v2()
returns int language plpgsql security definer as $$
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
    -- 30d real-world execution success.
    select package_id,
           count(*) filter (where success)::numeric as rw_succ,
           count(*)::numeric                        as rw_total
    from public.skill_executions
    where created_at >= now() - interval '30 days'
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
           -- safety: lower-bounded pass rate + gated severity-weighted score
           ( 0.6 * public.wilson_lower_bound(adv_succ, adv_total)
           + 0.4 * least(1, greatest(0, adv_weighted)) * least(1, adv_total / 8.0)
           ) as safety,
           public.wilson_lower_bound(rw_succ, rw_total) as competence,
           -- freshness: 0.7 * recency term + 0.3 * signed-release credit
           ( 0.7 * (case
                      when last_verified_days is null then 0
                      when last_verified_days <= 30 then 1
                      when last_verified_days >= 180 then 0
                      else 1 - (last_verified_days - 30) / 150.0
                    end)
           + 0.3 * least(1, signed_releases / 3.0)
           ) as freshness,
           -- confidence: more evidence ⇒ more trust in the number
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
           -- rawQuality blend (weights sum to 1.0; safety dominates)
           least(1, greatest(0,
             0.10 * 1            -- schema_valid (gated upstream at publish time)
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
$$;

-- Point the nightly cron at v2. (v1 function is left intact for rollback.)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'recompute-trust-scores-nightly') then
    perform cron.unschedule('recompute-trust-scores-nightly');
  end if;
  perform cron.schedule(
    'recompute-trust-scores-nightly',
    '17 3 * * *',
    $cron$select public.recompute_trust_scores_v2();$cron$
  );
end;
$$;
