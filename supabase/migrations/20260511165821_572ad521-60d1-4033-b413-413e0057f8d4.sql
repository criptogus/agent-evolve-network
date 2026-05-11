INSERT INTO public.plans (slug, name, monthly_credits, monthly_runs_limit, max_installed_packages, price_cents, sort_order, features)
VALUES ('unlimited', 'Unlimited', 2147483647, 2147483647, 2147483647, 0, 999, '["Unlimited runs","Unlimited credits","Unlimited installs","Owner access"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  monthly_credits = EXCLUDED.monthly_credits,
  monthly_runs_limit = EXCLUDED.monthly_runs_limit,
  max_installed_packages = EXCLUDED.max_installed_packages,
  features = EXCLUDED.features,
  updated_at = now();