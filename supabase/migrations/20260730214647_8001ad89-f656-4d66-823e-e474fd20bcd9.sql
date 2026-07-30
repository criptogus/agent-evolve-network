-- Column-level hardening: profiles stay publicly readable for marketplace
-- pages, but referral_code is no longer scrapable (referral fraud vector).
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Owners keep write access to their own row (RLS still scopes to auth.uid()).
GRANT INSERT (id, handle, display_name, avatar_url, bio), UPDATE (handle, display_name, avatar_url, bio)
  ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;