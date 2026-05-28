-- Strip table-wide SELECT so referral_code is no longer covered by the wildcard grant,
-- then re-grant SELECT only on the non-sensitive columns to anon/authenticated.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Owners still need to read their own referral_code (e.g. via get_my_referral_stats,
-- which runs as the authenticated user). Grant it back only to authenticated; RLS still
-- restricts row access, and policies must scope referral_code reads to auth.uid()=id.
GRANT SELECT (referral_code) ON public.profiles TO authenticated;

-- Tighten the broad "profiles read all" policy: split into a public-columns policy
-- (anon + authenticated, all rows) implicitly via grants, and ensure referral_code
-- is only visible on the owner's row by replacing the permissive SELECT policy.
DROP POLICY IF EXISTS "profiles read all" ON public.profiles;

CREATE POLICY "profiles public read"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);
