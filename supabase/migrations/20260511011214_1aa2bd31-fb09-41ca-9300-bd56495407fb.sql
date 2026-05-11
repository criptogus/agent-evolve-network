
-- 1. Add price column to packages (in credits; 0 = free)
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS price_credits integer NOT NULL DEFAULT 0
    CHECK (price_credits >= 0);

-- 2. Add monthly credit grant to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_credits integer NOT NULL DEFAULT 0
    CHECK (monthly_credits >= 0);

-- 3. Credit ledger (append-only)
DO $$ BEGIN
  CREATE TYPE public.credit_reason AS ENUM (
    'signup_bonus','subscription_grant','purchase','sale','refund','manual_adjustment','promo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason public.credit_reason NOT NULL,
  ref_type text,
  ref_id uuid,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created
  ON public.credit_ledger (user_id, created_at DESC);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger self read" ON public.credit_ledger;
CREATE POLICY "ledger self read" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- No INSERT/UPDATE/DELETE policies => only SECURITY DEFINER functions can write.

-- 4. Package purchases (lifetime ownership)
CREATE TABLE IF NOT EXISTS public.package_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  package_id uuid NOT NULL,
  author_id uuid,
  credits_paid integer NOT NULL CHECK (credits_paid >= 0),
  author_credits integer NOT NULL DEFAULT 0,
  platform_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_package_purchases_buyer ON public.package_purchases (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_purchases_author ON public.package_purchases (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_purchases_package ON public.package_purchases (package_id);

ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases self read" ON public.package_purchases;
CREATE POLICY "purchases self read" ON public.package_purchases
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

-- 5. Balance helper
CREATE OR REPLACE FUNCTION public.get_credit_balance(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::int FROM public.credit_ledger WHERE user_id = _user_id
$$;

-- 6. Internal credit-grant helper (used by RPCs and triggers; not callable by clients directly via RLS)
CREATE OR REPLACE FUNCTION public._credit_apply(
  _user_id uuid,
  _delta integer,
  _reason public.credit_reason,
  _ref_type text,
  _ref_id uuid,
  _description text,
  _metadata jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  SELECT COALESCE(SUM(delta), 0)::int INTO current_balance
    FROM public.credit_ledger WHERE user_id = _user_id FOR UPDATE;
  new_balance := current_balance + _delta;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, description, metadata)
  VALUES (_user_id, _delta, new_balance, _reason, _ref_type, _ref_id, _description, COALESCE(_metadata,'{}'::jsonb));
  RETURN new_balance;
END $$;

-- 7. Atomic package purchase RPC (callable by authenticated users)
CREATE OR REPLACE FUNCTION public.purchase_package(_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _buyer uuid := auth.uid();
  _pkg record;
  _author_share integer;
  _platform_share integer;
  _purchase_id uuid;
  _buyer_balance integer;
BEGIN
  IF _buyer IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;

  SELECT id, author_id, price_credits, is_published, review_status, name, slug
    INTO _pkg FROM public.packages WHERE id = _package_id FOR SHARE;
  IF _pkg.id IS NULL THEN RAISE EXCEPTION 'PACKAGE_NOT_FOUND'; END IF;
  IF NOT _pkg.is_published OR _pkg.review_status <> 'approved' THEN
    RAISE EXCEPTION 'PACKAGE_NOT_AVAILABLE';
  END IF;
  IF _pkg.author_id = _buyer THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_PACKAGE'; END IF;
  IF _pkg.price_credits = 0 THEN RAISE EXCEPTION 'PACKAGE_IS_FREE'; END IF;

  IF EXISTS (SELECT 1 FROM public.package_purchases WHERE buyer_id = _buyer AND package_id = _package_id) THEN
    RAISE EXCEPTION 'ALREADY_OWNED';
  END IF;

  -- 70/30 split, integer math
  _author_share := (_pkg.price_credits * 70) / 100;
  _platform_share := _pkg.price_credits - _author_share;

  INSERT INTO public.package_purchases (buyer_id, package_id, author_id, credits_paid, author_credits, platform_credits)
  VALUES (_buyer, _package_id, _pkg.author_id, _pkg.price_credits, _author_share, _platform_share)
  RETURNING id INTO _purchase_id;

  -- Debit buyer (will raise INSUFFICIENT_CREDITS if not enough)
  _buyer_balance := public._credit_apply(
    _buyer, -_pkg.price_credits, 'purchase', 'package_purchase', _purchase_id,
    'Purchased ' || _pkg.name, jsonb_build_object('package_slug', _pkg.slug)
  );

  -- Credit author (skip if package has no author)
  IF _pkg.author_id IS NOT NULL AND _author_share > 0 THEN
    PERFORM public._credit_apply(
      _pkg.author_id, _author_share, 'sale', 'package_purchase', _purchase_id,
      'Sold ' || _pkg.name, jsonb_build_object('package_slug', _pkg.slug, 'buyer_id', _buyer)
    );
  END IF;

  UPDATE public.packages SET install_count = install_count + 1 WHERE id = _package_id;

  RETURN jsonb_build_object(
    'purchase_id', _purchase_id,
    'credits_paid', _pkg.price_credits,
    'author_credits', _author_share,
    'platform_credits', _platform_share,
    'new_balance', _buyer_balance
  );
END $$;

GRANT EXECUTE ON FUNCTION public.purchase_package(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(uuid) TO authenticated;

-- 8. Signup bonus (one-time, idempotent)
CREATE OR REPLACE FUNCTION public.grant_signup_bonus(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = _user_id AND reason = 'signup_bonus') THEN
    RETURN;
  END IF;
  PERFORM public._credit_apply(_user_id, 100, 'signup_bonus', 'signup', NULL, 'Welcome bonus', '{}'::jsonb);
END $$;

-- Hook into existing handle_new_user (recreate to add bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(NEW.id::text, 1, 8)
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  PERFORM public.grant_signup_bonus(NEW.id);
  RETURN NEW;
END $$;

-- Ensure trigger exists (recreate idempotently)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
