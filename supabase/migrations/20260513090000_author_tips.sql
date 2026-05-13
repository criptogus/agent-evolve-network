-- Author tipping ledger. Tips go 100% to the author (no platform fee) — the
-- viral signal of an author getting paid quickly outweighs the missed take.
-- Tracks raw intent rows and confirmed payouts separately.

create table if not exists public.author_tip_intents (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete set null,
  payer_user_id uuid,
  recipient_user_id uuid not null,
  amount_cents int not null check (amount_cents between 100 and 50_000_00),  -- $1 - $50k
  currency text not null default 'usd',
  message text,
  source text,                                  -- 'package_page' | 'collection' | 'cli' | ...
  payment_provider text not null,               -- 'stripe' | 'paddle'
  provider_intent_id text,                      -- e.g. Stripe PaymentIntent id
  status text not null default 'created' check (status in ('created','succeeded','failed','refunded')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists tip_intents_recipient_idx
  on public.author_tip_intents (recipient_user_id, created_at desc);
create index if not exists tip_intents_pkg_idx
  on public.author_tip_intents (package_id, created_at desc);

alter table public.author_tip_intents enable row level security;

create policy "tip_intents_read_recipient"
  on public.author_tip_intents for select to authenticated
  using (recipient_user_id = auth.uid() or payer_user_id = auth.uid());

-- View: per-package tip totals — drives the "❤ $128 tipped" badge on the
-- package page without exposing payer identities.
create or replace view public.package_tip_totals as
select
  package_id,
  sum(amount_cents) filter (where status = 'succeeded')::int as total_cents_succeeded,
  count(*) filter (where status = 'succeeded')::int as count_succeeded
from public.author_tip_intents
where package_id is not null
group by package_id;
