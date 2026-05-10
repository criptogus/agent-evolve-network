
-- Extend packages
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS source_ref text;

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_runs_limit integer NOT NULL DEFAULT 100,
  max_installed_packages integer NOT NULL DEFAULT 5,
  price_cents integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans admin write" ON public.plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans (slug, name, monthly_runs_limit, max_installed_packages, price_cents, features, sort_order)
VALUES
  ('free','Free',100,5,0,'["Community packages","Basic evaluation"]'::jsonb,1),
  ('pro','Pro',5000,100,4900,'["All public packages","Auto-learn","Hot-swap"]'::jsonb,2),
  ('enterprise','Enterprise',100000,1000,49900,'["Private packages","SAML SSO","Priority support"]'::jsonb,3)
ON CONFLICT (slug) DO NOTHING;

-- Account plans
CREATE TABLE IF NOT EXISTS public.account_plans (
  user_id uuid PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_plans self read" ON public.account_plans FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "account_plans admin write" ON public.account_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Package imports
CREATE TABLE IF NOT EXISTS public.package_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind text NOT NULL,
  source_ref text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  generated_package_id uuid,
  notes text,
  raw_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imports admin all" ON public.package_imports FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Package requests
CREATE TABLE IF NOT EXISTS public.package_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid,
  brief text NOT NULL,
  kind text NOT NULL,
  industry text,
  status text NOT NULL DEFAULT 'new',
  research_summary text,
  research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluation jsonb,
  generated_package_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.package_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests insert auth" ON public.package_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "requests self read" ON public.package_requests FOR SELECT
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "requests admin update" ON public.package_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "requests admin delete" ON public.package_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS plans_touch ON public.plans;
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS account_plans_touch ON public.account_plans;
CREATE TRIGGER account_plans_touch BEFORE UPDATE ON public.account_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS package_imports_touch ON public.package_imports;
CREATE TRIGGER package_imports_touch BEFORE UPDATE ON public.package_imports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS package_requests_touch ON public.package_requests;
CREATE TRIGGER package_requests_touch BEFORE UPDATE ON public.package_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
