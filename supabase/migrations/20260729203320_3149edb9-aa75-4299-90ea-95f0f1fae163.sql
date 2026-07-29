REVOKE ALL ON FUNCTION public.award_referral_credits(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_referral_credits(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.award_referral_credits(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_referral_credits(uuid, text, integer) TO service_role;

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at) ON public.profiles TO anon;
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at) ON public.profiles TO authenticated;