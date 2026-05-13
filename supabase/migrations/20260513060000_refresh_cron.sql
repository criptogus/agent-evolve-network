-- Scheduled refresh of materialized views + nightly Trust Score recompute.
-- Requires the pg_cron extension (enabled in Supabase via SQL or dashboard).

create extension if not exists pg_cron;

-- Refresh skill_performance_daily every 15 minutes.
select cron.schedule(
  'refresh-skill-performance-daily',
  '*/15 * * * *',
  $$refresh materialized view concurrently public.skill_performance_daily;$$
);

-- Refresh the 30d affiliate leaderboard every hour.
select cron.schedule(
  'refresh-affiliate-leaderboard-30d',
  '0 * * * *',
  $$refresh materialized view concurrently public.affiliate_leaderboard_30d;$$
);

-- Trust Score recompute — pure-SQL aggregation that joins the latest
-- adversarial pass rate, 30d real-world success rate, signed releases,
-- package age, and writes into public.package_trust_scores.
create or replace function public.recompute_trust_scores()
returns int language plpgsql security definer as $$
declare
  affected int := 0;
begin
  with adv as (
    select package_id,
           avg(pass_rate)::numeric(5,4) as adversarial_pass_rate,
           avg(severity_weighted_score)::numeric(5,4) as adv_weighted
    from public.adversarial_runs
    where created_at >= now() - interval '30 days'
    group by package_id
  ),
  perf as (
    select package_id,
           sum(successes)::numeric / nullif(sum(runs), 0) as real_world_success_rate
    from public.skill_performance_daily
    where day >= now() - interval '30 days'
    group by package_id
  ),
  releases as (
    select package_id, count(*)::int as signed_releases
    from public.package_releases group by package_id
  ),
  pkg as (
    select p.id, p.created_at,
           coalesce(adv.adversarial_pass_rate, 0.5) as adv_pass,
           coalesce(adv.adv_weighted, 0.5)         as adv_weighted,
           coalesce(perf.real_world_success_rate, 0.5) as real_world,
           coalesce(releases.signed_releases, 0)   as signed_releases,
           extract(epoch from (now() - p.created_at)) / 86400 as age_days
    from public.packages p
    left join adv     on adv.package_id     = p.id
    left join perf    on perf.package_id    = p.id
    left join releases on releases.package_id = p.id
  ),
  scored as (
    select id,
           adv_pass, adv_weighted, real_world, signed_releases, age_days,
           least(1.0, greatest(0.0,
             0.10                                                                    -- schema_valid always 1
           + 0.20 * adv_pass
           + 0.25 * adv_weighted
           + 0.20 * real_world
           + 0.10 * least(1.0, signed_releases::numeric / 3)
           + 0.05 * least(1.0, ln(age_days + 1) / ln(316))
           ))::numeric(5,4) as score
    from pkg
  )
  insert into public.package_trust_scores
    (package_id, score, schema_valid, adversarial_pass_rate,
     adversarial_weighted_score, real_world_success_rate,
     signed_releases, age_days, components, computed_at)
  select id, score, true, adv_pass, adv_weighted, real_world,
         signed_releases, age_days::int,
         jsonb_build_object(
           'adv_pass', adv_pass, 'adv_weighted', adv_weighted,
           'real_world', real_world, 'signed_releases', signed_releases,
           'age_days', age_days
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
    components = excluded.components,
    computed_at = excluded.computed_at;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

select cron.schedule(
  'recompute-trust-scores-nightly',
  '17 3 * * *',
  $$select public.recompute_trust_scores();$$
);
