
-- Add catalog mapping to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS paddle_product_external_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_external_id TEXT;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_slug TEXT NOT NULL,
  paddle_subscription_id TEXT UNIQUE,
  paddle_customer_id TEXT,
  paddle_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  price_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs self read"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER subscriptions_touch
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Payment events log
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  env TEXT NOT NULL,
  payload JSONB NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_user_idx ON public.payment_events(user_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events admin read"
  ON public.payment_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;
