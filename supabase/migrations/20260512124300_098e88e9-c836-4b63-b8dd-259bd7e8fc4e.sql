
-- 1. profiles.referral_code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_count int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END $$;

-- backfill existing rows
UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

-- 2. referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  source_url text,
  package_slug text,
  status text NOT NULL DEFAULT 'signed_up',  -- signed_up | subscribed | rewarded
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  subscribed_at timestamptz,
  first_purchase_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals self read" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. referral_rewards (idempotent payout log)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  kind text NOT NULL,  -- signup | subscription | purchase
  credits int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referral_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_rewards self read" ON public.referral_rewards FOR SELECT
  USING (auth.uid() = referrer_id OR public.has_role(auth.uid(), 'admin'));

-- 4. referral_clicks (lightweight analytics)
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id bigserial PRIMARY KEY,
  code text NOT NULL,
  target text,
  ip_hash text,
  ua_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(code);
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clicks admin read" ON public.referral_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. update handle_new_user trigger fn to set referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, handle, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(NEW.id::text, 1, 8),
    public.gen_referral_code()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  PERFORM public.grant_signup_bonus(NEW.id);
  RETURN NEW;
END $$;

-- 6. claim_referral RPC (called by signed-in user after signup)
CREATE OR REPLACE FUNCTION public.claim_referral(_code text, _source_url text DEFAULT NULL, _package_slug text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  ref_user uuid;
  existing uuid;
  signup_credits int := 20;
  bonus_for_referred int := 50;
  ref_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_CODE'); END IF;

  SELECT id INTO ref_user FROM public.profiles WHERE referral_code = upper(_code);
  IF ref_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'CODE_NOT_FOUND'); END IF;
  IF ref_user = uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'SELF_REFERRAL'); END IF;

  SELECT id INTO existing FROM public.referrals WHERE referred_user_id = uid;
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_CLAIMED'); END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, code, source_url, package_slug)
  VALUES (ref_user, uid, upper(_code), _source_url, _package_slug)
  RETURNING id INTO ref_id;

  -- Reward referrer for signup (idempotent via unique referral_id+kind)
  BEGIN
    PERFORM public._credit_apply(ref_user, signup_credits, 'promo', 'referral', ref_id,
      'Referral signup bonus', jsonb_build_object('referral_id', ref_id, 'kind', 'signup'));
    INSERT INTO public.referral_rewards (referral_id, referrer_id, kind, credits)
      VALUES (ref_id, ref_user, 'signup', signup_credits);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Bonus for the referred user
  BEGIN
    PERFORM public._credit_apply(uid, bonus_for_referred, 'promo', 'referral', ref_id,
      'Welcome bonus from referral', jsonb_build_object('referral_id', ref_id, 'kind', 'referred_bonus'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'referral_id', ref_id, 'referrer_id', ref_user);
END $$;

-- 7. award_referral_credits RPC (called from server: webhook + purchase hook)
CREATE OR REPLACE FUNCTION public.award_referral_credits(_referral_id uuid, _kind text, _credits int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  ref RECORD;
  monthly_cap int := 5000;
  awarded_this_month int;
  desc_text text;
BEGIN
  IF _kind NOT IN ('subscription', 'purchase') THEN
    RAISE EXCEPTION 'INVALID_KIND';
  END IF;
  IF _credits IS NULL OR _credits <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOTHING_TO_AWARD');
  END IF;

  SELECT * INTO ref FROM public.referrals WHERE id = _referral_id;
  IF ref IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'REFERRAL_NOT_FOUND'); END IF;

  -- Idempotency: subscription kind only ever paid once per referral
  IF _kind = 'subscription' THEN
    IF EXISTS (SELECT 1 FROM public.referral_rewards WHERE referral_id = _referral_id AND kind = 'subscription') THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_AWARDED');
    END IF;
  END IF;

  -- Monthly cap
  SELECT COALESCE(SUM(credits), 0) INTO awarded_this_month
    FROM public.referral_rewards
   WHERE referrer_id = ref.referrer_id AND created_at > date_trunc('month', now());
  IF awarded_this_month + _credits > monthly_cap THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MONTHLY_CAP');
  END IF;

  desc_text := CASE _kind
    WHEN 'subscription' THEN 'Referral: subscriber bonus'
    WHEN 'purchase' THEN 'Referral: purchase commission'
  END;

  PERFORM public._credit_apply(ref.referrer_id, _credits, 'promo', 'referral', _referral_id,
    desc_text, jsonb_build_object('referral_id', _referral_id, 'kind', _kind));

  INSERT INTO public.referral_rewards (referral_id, referrer_id, kind, credits)
    VALUES (_referral_id, ref.referrer_id, _kind, _credits);

  IF _kind = 'subscription' THEN
    UPDATE public.referrals SET subscribed_at = now(), status = 'subscribed' WHERE id = _referral_id;
  ELSIF _kind = 'purchase' THEN
    UPDATE public.referrals SET first_purchase_at = COALESCE(first_purchase_at, now()) WHERE id = _referral_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'credits', _credits);
END $$;

-- 8. referral stats helper
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  my_code text;
  total_signups int;
  total_subscribed int;
  total_credits int;
  total_clicks int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  SELECT referral_code INTO my_code FROM public.profiles WHERE id = uid;
  SELECT count(*) INTO total_signups FROM public.referrals WHERE referrer_id = uid;
  SELECT count(*) INTO total_subscribed FROM public.referrals WHERE referrer_id = uid AND subscribed_at IS NOT NULL;
  SELECT COALESCE(SUM(credits),0) INTO total_credits FROM public.referral_rewards WHERE referrer_id = uid;
  SELECT count(*) INTO total_clicks FROM public.referral_clicks WHERE code = my_code;
  RETURN jsonb_build_object(
    'authenticated', true,
    'referral_code', my_code,
    'signups', total_signups,
    'subscribed', total_subscribed,
    'credits_earned', total_credits,
    'clicks', total_clicks
  );
END $$;
