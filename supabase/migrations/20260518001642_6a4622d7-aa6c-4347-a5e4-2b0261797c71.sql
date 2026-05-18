
-- Restrict adversarial_cases reads to admins only (proprietary test data).
DROP POLICY IF EXISTS "adversarial_cases_read" ON public.adversarial_cases;
CREATE POLICY "adversarial_cases_admin_read"
  ON public.adversarial_cases
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Keep profiles publicly readable for handles/display_name/avatar but
-- hide the referral_code column from PostgREST clients. Service-role
-- and SECURITY DEFINER RPCs (get_my_referral_stats) continue to work.
REVOKE SELECT (referral_code) ON public.profiles FROM anon, authenticated;
