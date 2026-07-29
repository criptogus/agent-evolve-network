INSERT INTO public.user_roles (user_id, role)
VALUES ('9c17d4ec-ef4e-484c-b989-9b9c62736165', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscriptions (
  user_id, plan_slug, status, environment, price_id,
  current_period_start, current_period_end, price_cents, currency
) VALUES (
  '9c17d4ec-ef4e-484c-b989-9b9c62736165',
  'agent_pass_pro_monthly',
  'active',
  'live',
  'agent_pass_pro_monthly',
  now(),
  now() + interval '100 years',
  1900,
  'USD'
);