-- Bounty board (paid challenges) + affiliate leaderboard (referrer ranking).

create table if not exists public.skill_bounties (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null,
  title text not null,
  brief text not null,
  vertical text not null check (vertical in ('security','fintech','healthcare','devops','general')),
  required_trust_score numeric(3,2) not null default 0.85,
  required_adversarial_pass numeric(3,2) not null default 0.80,
  reward_cents int not null check (reward_cents >= 0),
  currency text not null default 'usd',
  deadline timestamptz,
  status text not null default 'open' check (status in ('open','claimed','paid','cancelled','expired')),
  winning_package_id uuid references public.packages(id) on delete set null,
  winner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skill_bounties_status_idx on public.skill_bounties (status, vertical);
create index if not exists skill_bounties_reward_idx on public.skill_bounties (reward_cents desc);

create table if not exists public.bounty_submissions (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.skill_bounties(id) on delete cascade,
  submitted_by uuid not null,
  package_id uuid not null references public.packages(id) on delete cascade,
  trust_score_at_submission numeric(5,4),
  adversarial_score_at_submission numeric(5,4),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  submitted_at timestamptz not null default now(),
  unique (bounty_id, package_id)
);

create index if not exists bounty_submissions_bounty_idx
  on public.bounty_submissions (bounty_id, status);

-- Materialized leaderboard refreshed daily — referrer ranking by activated users.
create materialized view if not exists public.affiliate_leaderboard_30d as
select
  r.referrer_user_id,
  count(*) as activated_referrals,
  coalesce(sum(p.amount_cents) filter (where p.kind = 'referral'), 0) as referral_earnings_cents
from public.referrals r
left join public.revenue_share_payouts p
  on p.payee_user_id = r.referrer_user_id
  and p.kind = 'referral'
  and p.created_at >= now() - interval '30 days'
where r.signed_up_at >= now() - interval '30 days'
group by r.referrer_user_id;

create unique index if not exists affiliate_leaderboard_30d_uidx
  on public.affiliate_leaderboard_30d (referrer_user_id);

alter table public.skill_bounties enable row level security;
alter table public.bounty_submissions enable row level security;

create policy "bounties_read_public"
  on public.skill_bounties for select to authenticated, anon
  using (status in ('open','claimed','paid'));

create policy "bounties_write_owner"
  on public.skill_bounties for update to authenticated
  using (posted_by = auth.uid());

create policy "submissions_read_own"
  on public.bounty_submissions for select to authenticated
  using (submitted_by = auth.uid()
         or exists (select 1 from public.skill_bounties b
                    where b.id = bounty_submissions.bounty_id and b.posted_by = auth.uid()));
