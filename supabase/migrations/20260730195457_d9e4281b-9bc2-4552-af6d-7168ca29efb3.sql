alter table public.adversarial_runs
  add column if not exists subject_arm text not null default 'certified';
alter table public.adversarial_runs
  drop constraint if exists adversarial_runs_subject_arm_chk;
alter table public.adversarial_runs
  add constraint adversarial_runs_subject_arm_chk
  check (subject_arm in ('certified','baseline','frozen_v1'));

create index if not exists adversarial_runs_arm_idx
  on public.adversarial_runs (subject_arm, created_at desc);

create or replace function public.wilson_lower_bound(successes bigint, total bigint)
returns numeric language sql immutable set search_path to 'public' as $$
  select case
    when total is null or total <= 0 then 0
    else greatest(0, least(1, (
      (successes::numeric / total + power(1.96,2)/(2*total)
        - 1.96 * sqrt( (successes::numeric/total)*(1-successes::numeric/total)/total
                       + power(1.96,2)/(4*power(total,2)) ))
      / (1 + power(1.96,2)/total)
    )))
  end;
$$;

create or replace function public.get_attack_class_benchmark(_days int default 90)
returns table (
  attack_class text,
  subject_arm text,
  total bigint,
  passed bigint,
  pass_rate numeric,
  wilson_lb numeric
) language sql stable set search_path to 'public' as $$
  with class_map(attack_class, category) as (
    values
      ('prompt_injection','prompt_injection'), ('prompt_injection','instruction_drift'),
      ('jailbreak','jailbreak'),               ('jailbreak','policy_violation'),
      ('data_exfiltration','data_exfiltration'),('data_exfiltration','pii_leak'),
      ('policy_bypass','harmful_action'),      ('policy_bypass','tool_misuse')
  ),
  exploded as (
    select r.subject_arm,
           cat.key as category,
           (cat.value->>'total')::bigint as total,
           (cat.value->>'passed')::bigint as passed
    from public.adversarial_runs r,
         lateral jsonb_each(r.by_category) as cat
    where r.created_at >= now() - make_interval(days => _days)
  )
  select m.attack_class,
         e.subject_arm,
         sum(e.total) as total,
         sum(e.passed) as passed,
         (sum(e.passed)::numeric / nullif(sum(e.total),0)) as pass_rate,
         public.wilson_lower_bound(sum(e.passed), sum(e.total)) as wilson_lb
  from exploded e
  join class_map m on m.category = e.category
  group by m.attack_class, e.subject_arm
  order by m.attack_class, e.subject_arm;
$$;

create table if not exists public.package_weekly_metrics (
  id bigserial primary key,
  package_id uuid not null references public.packages(id) on delete cascade,
  package_slug text not null,
  week_start date not null,
  track text not null default 'current' check (track in ('current','frozen_v1')),
  runs int not null default 0,
  successes int not null default 0,
  success_rate numeric(5,4),
  success_rate_wilson_lb numeric(5,4),
  task_completed_rate numeric(5,4),
  p95_latency_ms numeric,
  avg_tokens numeric,
  adversarial_pass_rate numeric(5,4),
  adversarial_weighted numeric(5,4),
  trust_score numeric(5,4),
  created_at timestamptz not null default now(),
  unique (package_id, week_start, track)
);

create index if not exists pkg_weekly_metrics_slug_idx
  on public.package_weekly_metrics (package_slug, week_start desc);

grant select on public.package_weekly_metrics to anon, authenticated;
grant all on public.package_weekly_metrics to service_role;

alter table public.package_weekly_metrics enable row level security;
drop policy if exists "weekly metrics readable" on public.package_weekly_metrics;
create policy "weekly metrics readable"
  on public.package_weekly_metrics for select
  to authenticated, anon
  using (true);

create or replace function public.snapshot_package_weekly_metrics()
returns int language plpgsql security definer set search_path to 'public' as $$
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
    where e.package_id = p.id
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
$$;

select cron.unschedule('snapshot-package-weekly-metrics')
where exists (select 1 from cron.job where jobname = 'snapshot-package-weekly-metrics');

select cron.schedule(
  'snapshot-package-weekly-metrics',
  '10 2 * * 1',
  $$select public.snapshot_package_weekly_metrics();$$
);

create or replace view public.findings_mttr
with (security_invoker = on) as
select
  count(*) as fixed_findings,
  percentile_cont(0.5) within group
    (order by extract(epoch from (rel.signed_at - f.published_at)) / 3600.0)
    as median_hours_to_patch,
  avg(extract(epoch from (rel.signed_at - f.published_at)) / 3600.0)
    as mean_hours_to_patch
from public.skill_robustness_findings f
join public.package_releases rel
  on rel.package_id = f.package_id and rel.version = f.fixed_in_version
where f.status = 'public'
  and f.published_at is not null
  and f.fixed_in_version is not null;

grant select on public.findings_mttr to anon, authenticated;