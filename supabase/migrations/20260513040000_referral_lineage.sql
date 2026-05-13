-- Viral growth: referral revenue share + lineage of forked packages.
-- Loops:
--  1. Author A refers Author B with ?ref=@A; B publishes a premium package;
--     A receives 10% of B's revenue share for 12 months.
--  2. Author C forks A's package; A becomes upstream and receives a fixed
--     percentage of C's premium revenue indefinitely (lineage attribution).

create table if not exists public.referral_codes (
  code text primary key,                  -- typically the author handle
  referrer_user_id uuid not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null,
  referred_user_id uuid not null unique,
  code text not null references public.referral_codes(code),
  signed_up_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 months'),
  rev_share_bps int not null default 1000  -- 10.00%
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);

create table if not exists public.package_lineage (
  child_package_id uuid primary key references public.packages(id) on delete cascade,
  parent_package_id uuid not null references public.packages(id) on delete restrict,
  fork_kind text not null check (fork_kind in ('fork','adaptation','translation','derivative')),
  rev_share_bps int not null default 500,  -- 5.00% to upstream
  attributed_at timestamptz not null default now(),
  attributed_by uuid not null
);

create index if not exists package_lineage_parent_idx
  on public.package_lineage (parent_package_id);

-- Payouts ledger so both viral mechanics share a single accounting surface.
create table if not exists public.revenue_share_payouts (
  id bigserial primary key,
  source_payment_id text not null,        -- e.g. Stripe/Paddle charge id
  package_id uuid references public.packages(id) on delete set null,
  payee_user_id uuid not null,
  payer_user_id uuid,                     -- when applicable (author of the sold package)
  kind text not null check (kind in ('referral','lineage','platform','author')),
  amount_cents int not null,
  currency text not null default 'usd',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists rsp_payee_idx on public.revenue_share_payouts (payee_user_id, created_at desc);
create index if not exists rsp_pkg_idx on public.revenue_share_payouts (package_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.package_lineage enable row level security;
alter table public.revenue_share_payouts enable row level security;

create policy "ref_codes_read_own"
  on public.referral_codes for select
  to authenticated using (referrer_user_id = auth.uid() or is_active = true);
create policy "referrals_read_own"
  on public.referrals for select
  to authenticated using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());
create policy "lineage_read_any"
  on public.package_lineage for select
  to authenticated, anon using (true);
create policy "payouts_read_self"
  on public.revenue_share_payouts for select
  to authenticated using (payee_user_id = auth.uid());
