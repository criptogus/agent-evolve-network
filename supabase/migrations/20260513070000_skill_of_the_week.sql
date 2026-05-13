-- Skill of the Week: weekly leaderboard + hall of fame.
-- Selection runs weekly; ranks by (trust_score * adversarial_pass) * log(installs_7d + 1)
-- multiplied by a novelty bonus for first-time winners.

create table if not exists public.skill_of_the_week (
  id uuid primary key default gen_random_uuid(),
  week_starting date not null unique,            -- Monday UTC
  package_id uuid not null references public.packages(id) on delete cascade,
  rank int not null default 1,
  score numeric(8,4) not null,
  trust_score numeric(5,4),
  adversarial_pass_rate numeric(5,4),
  installs_7d int,
  novelty_bonus numeric(3,2) not null default 1.0,
  announced_at timestamptz not null default now()
);

create index if not exists sotw_pkg_idx on public.skill_of_the_week (package_id, week_starting desc);

alter table public.skill_of_the_week enable row level security;
create policy "sotw_read_public"
  on public.skill_of_the_week for select to authenticated, anon using (true);

-- Selection function — called by cron each Monday at 14:00 UTC.
-- Insert ON CONFLICT DO NOTHING makes the run idempotent within a week.
create or replace function public.pick_skill_of_the_week()
returns uuid language plpgsql security definer as $$
declare
  week_start date := date_trunc('week', current_date)::date;
  winner_id uuid;
  winner_score numeric(8,4);
  winner_trust numeric(5,4);
  winner_adv numeric(5,4);
  winner_installs int;
  novelty numeric(3,2);
begin
  with ranked as (
    select
      p.id as package_id,
      ts.score as trust_score,
      ts.adversarial_pass_rate as adv,
      coalesce(sum(perf.runs), 0)::int as installs_7d,
      case
        when not exists (select 1 from public.skill_of_the_week s where s.package_id = p.id)
          then 1.25
        else 1.0
      end as novelty,
      (
        coalesce(ts.score, 0) *
        coalesce(ts.adversarial_pass_rate, 0) *
        ln(coalesce(sum(perf.runs), 0)::numeric + 1) *
        case
          when not exists (select 1 from public.skill_of_the_week s where s.package_id = p.id)
            then 1.25
          else 1.0
        end
      )::numeric(8,4) as score
    from public.packages p
    join public.package_trust_scores ts on ts.package_id = p.id
    left join public.skill_performance_daily perf
      on perf.package_id = p.id
     and perf.day >= now() - interval '7 days'
    where p.is_published
    group by p.id, ts.score, ts.adversarial_pass_rate
    having coalesce(sum(perf.runs), 0) > 0
    order by score desc
    limit 1
  )
  select package_id, score, trust_score, adv, installs_7d, novelty
    into winner_id, winner_score, winner_trust, winner_adv, winner_installs, novelty
  from ranked;

  if winner_id is null then return null; end if;

  insert into public.skill_of_the_week
    (week_starting, package_id, rank, score, trust_score, adversarial_pass_rate, installs_7d, novelty_bonus)
  values
    (week_start, winner_id, 1, winner_score, winner_trust, winner_adv, winner_installs, novelty)
  on conflict (week_starting) do nothing;

  return winner_id;
end;
$$;

select cron.schedule(
  'pick-skill-of-the-week',
  '0 14 * * 1',  -- Mondays 14:00 UTC
  $$select public.pick_skill_of_the_week();$$
);
