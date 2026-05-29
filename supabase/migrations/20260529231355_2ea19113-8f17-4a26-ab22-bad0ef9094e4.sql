-- =====================================================================
-- Base tables (from 20260513010000 — never applied, recreated idempotently)
-- =====================================================================
create table if not exists public.package_releases (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  version_id uuid not null references public.package_versions(id) on delete cascade,
  version text not null,
  content_hash text not null,
  signature text not null,
  signing_key_id text not null,
  signed_at timestamptz not null default now(),
  signed_by uuid,
  unique (package_id, version)
);

create index if not exists package_releases_pkg_idx
  on public.package_releases (package_id, signed_at desc);

grant select on public.package_releases to anon, authenticated;
grant all on public.package_releases to service_role;

alter table public.package_releases enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='package_releases' and policyname='package_releases_read'
  ) then
    create policy "package_releases_read"
      on public.package_releases for select
      to authenticated, anon using (true);
  end if;
end $$;

create table if not exists public.package_trust_scores (
  package_id uuid primary key references public.packages(id) on delete cascade,
  score numeric(5,4) not null,
  schema_valid boolean not null,
  adversarial_pass_rate numeric(5,4),
  adversarial_weighted_score numeric(5,4),
  real_world_success_rate numeric(5,4),
  signed_releases int not null default 0,
  age_days int,
  components jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

grant select on public.package_trust_scores to anon, authenticated;
grant all on public.package_trust_scores to service_role;

alter table public.package_trust_scores enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='package_trust_scores' and policyname='trust_scores_read'
  ) then
    create policy "trust_scores_read"
      on public.package_trust_scores for select
      to authenticated, anon using (true);
  end if;
end $$;

-- =====================================================================
-- Migration 1: Trust Score v2
-- =====================================================================
alter table public.package_trust_scores
  add column if not exists trust_version text not null default '2.0.0',
  add column if not exists confidence numeric(5,4),
  add column if not exists verified boolean not null default false,
  add column if not exists dim_safety numeric(5,4),
  add column if not exists dim_competence numeric(5,4),
  add column if not exists dim_freshness numeric(5,4),
  add column if not exists dim_coverage numeric(5,4);

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

create or replace function public.trust_saturate(n numeric, k numeric)
returns numeric language sql immutable as $$
  select case when n is null or n <= 0 then 0 else n / (n + k) end;
$$;

create or replace function public.recompute_trust_scores_v2()
returns int language plpgsql security definer set search_path = public as $$
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
$$;

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

-- =====================================================================
-- Migration 2: Adversarial judge calibration telemetry
-- =====================================================================
alter table public.adversarial_runs
  add column if not exists judge_model text,
  add column if not exists judge_cases int,
  add column if not exists judge_overrides int,
  add column if not exists judge_agreement numeric(5,4),
  add column if not exists judge_kappa numeric(5,4);