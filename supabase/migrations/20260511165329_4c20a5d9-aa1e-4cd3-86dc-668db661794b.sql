alter table public.subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;

create unique index if not exists subscriptions_stripe_sub_id_key on public.subscriptions(stripe_subscription_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);