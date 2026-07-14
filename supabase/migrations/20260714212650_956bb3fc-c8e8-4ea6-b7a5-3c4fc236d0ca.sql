
-- 1) Hide referral_code from public reads by revoking column-level SELECT.
--    Owners read their code through get_my_referral_stats() (security definer).
REVOKE SELECT (referral_code) ON public.profiles FROM anon;
REVOKE SELECT (referral_code) ON public.profiles FROM authenticated;

-- Re-affirm safe column-level SELECTs for public/authenticated on the display fields.
GRANT SELECT (id, handle, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Service role keeps full access.
GRANT ALL ON public.profiles TO service_role;

-- 2) Explicit ownership-scoped INSERT policy for run_events so any client write
--    (using the user JWT) can only insert events tied to that user's own run.
--    Service role bypasses RLS and continues to work for background jobs.
DROP POLICY IF EXISTS "run_events owner insert" ON public.run_events;
CREATE POLICY "run_events owner insert"
  ON public.run_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_events.run_id
        AND r.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policies: writes to existing rows remain blocked for end users.
