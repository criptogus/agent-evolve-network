-- Restrict referral_code column from public SELECT on profiles.
-- Consumers already read it via the get_my_referral_stats RPC (SECURITY DEFINER),
-- so we can safely revoke direct column access from anon/authenticated.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Also make sure the newsletter_signups table has no anon/authenticated SELECT grant
-- (defence-in-depth on top of the admin-only SELECT policy).
REVOKE SELECT ON public.newsletter_signups FROM anon, authenticated;
GRANT SELECT ON public.newsletter_signups TO authenticated; -- policy still gates to admins
GRANT INSERT ON public.newsletter_signups TO anon, authenticated;
GRANT ALL ON public.newsletter_signups TO service_role;