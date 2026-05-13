-- Viral growth (additive): adds the 12-month revenue-share window on top of
-- the existing public.referrals + referral_rewards tables, plus package
-- lineage (forks) and a unified payouts ledger.
--
-- Existing schema kept intact:
--   profiles.referral_code           — per-user 4..16-char code
--   public.referrals(referrer_id, referred_user_id, code, status, ...)
--   public.referral_rewards          — idempotent credit payouts
--
-- This migration only ADDs columns and tables; no destructive changes.

-- Add the 12-month revenue-share window + bps to existing referrals rows.
alter table public.referrals
  add column if not exists revshare_expires_at timestamptz
    default (now() + interval '12 months'),
  add column if not exists revshare_bps int not null default 1000;  -- 10.00%

create index if not exists referrals_revshare_window_idx
  on public.referrals (referrer_id, revshare_expires_at);

-- Lineage of forked / adapted / translated packages. Upstream authors are
-- paid a bps cut every time a descendant package sells.
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

-- Unified payouts ledger for referral, lineage, author and platform shares.
-- Plays nicely alongside the legacy referral_rewards table (which logs
-- credit-denominated rewards from the original referral system).
create table if not exists public.revenue_share_payouts (
  id bigserial primary key,
  source_payment_id text not null,        -- e.g. Stripe/Paddle charge id
  package_id uuid references public.packages(id) on delete set null,
  payee_user_id uuid not null,
  payer_user_id uuid,                     -- when applicable
  kind text not null check (kind in ('referral','lineage','platform','author')),
  amount_cents int not null,
  currency text not null default 'usd',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists rsp_payee_idx on public.revenue_share_payouts (payee_user_id, created_at desc);
create index if not exists rsp_pkg_idx on public.revenue_share_payouts (package_id);

alter table public.package_lineage enable row level security;
alter table public.revenue_share_payouts enable row level security;

create policy "lineage_read_any"
  on public.package_lineage for select
  to authenticated, anon using (true);

create policy "payouts_read_self"
  on public.revenue_share_payouts for select
  to authenticated using (payee_user_id = auth.uid());
