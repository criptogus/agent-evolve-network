CREATE TABLE IF NOT EXISTS public.user_referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_referral_codes TO authenticated;
GRANT ALL ON public.user_referral_codes TO service_role;

ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral codes owner read" ON public.user_referral_codes;
CREATE POLICY "referral codes owner read"
ON public.user_referral_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

INSERT INTO public.user_referral_codes (user_id, code)
SELECT id, referral_code FROM public.profiles
WHERE referral_code IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
    SELECT count(*) INTO exists_count FROM public.user_referral_codes WHERE user_referral_codes.code = gen_referral_code.code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(NEW.id::text, 1, 8)
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_referral_codes (user_id, code)
  VALUES (NEW.id, public.gen_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  PERFORM public.grant_signup_bonus(NEW.id);
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid uuid := auth.uid();
  my_code text;
  total_signups int;
  total_subscribed int;
  total_credits int;
  total_clicks int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  SELECT code INTO my_code FROM public.user_referral_codes WHERE user_id = uid;
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
END $function$;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text, _source_url text DEFAULT NULL::text, _package_slug text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  SELECT user_id INTO ref_user FROM public.user_referral_codes WHERE code = upper(_code);
  IF ref_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'CODE_NOT_FOUND'); END IF;
  IF ref_user = uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'SELF_REFERRAL'); END IF;

  SELECT id INTO existing FROM public.referrals WHERE referred_user_id = uid;
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_CLAIMED'); END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, code, source_url, package_slug)
  VALUES (ref_user, uid, upper(_code), _source_url, _package_slug)
  RETURNING id INTO ref_id;

  BEGIN
    PERFORM public._credit_apply(ref_user, signup_credits, 'promo', 'referral', ref_id,
      'Referral signup bonus', jsonb_build_object('referral_id', ref_id, 'kind', 'signup'));
    INSERT INTO public.referral_rewards (referral_id, referrer_id, kind, credits)
      VALUES (ref_id, ref_user, 'signup', signup_credits);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    PERFORM public._credit_apply(uid, bonus_for_referred, 'promo', 'referral', ref_id,
      'Welcome bonus from referral', jsonb_build_object('referral_id', ref_id, 'kind', 'referred_bonus'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'referral_id', ref_id, 'referrer_id', ref_user);
END $function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;