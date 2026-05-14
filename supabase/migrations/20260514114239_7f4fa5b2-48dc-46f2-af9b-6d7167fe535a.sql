
CREATE TABLE IF NOT EXISTS public.mcp_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  identity text NOT NULL,
  tool_name text NOT NULL,
  is_write boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mcp_call_log_identity_created_idx
  ON public.mcp_call_log (identity, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_call_log_user_created_idx
  ON public.mcp_call_log (user_id, created_at DESC);

ALTER TABLE public.mcp_call_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own mcp call log" ON public.mcp_call_log;
CREATE POLICY "users see own mcp call log" ON public.mcp_call_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mcp_check_and_log_call(
  _user_id uuid,
  _identity text,
  _tool_name text,
  _is_write boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_paid boolean := false;
  tier text;
  day_limit int;
  hour_limit int;
  day_used int;
  hour_used int;
BEGIN
  IF _user_id IS NOT NULL THEN
    is_paid := public.has_active_subscription(_user_id);
  END IF;

  IF _user_id IS NULL THEN
    tier := 'anonymous';
    day_limit  := CASE WHEN _is_write THEN 0  ELSE 20 END;
    hour_limit := CASE WHEN _is_write THEN 0  ELSE 8  END;
  ELSIF is_paid THEN
    tier := 'paid';
    day_limit  := CASE WHEN _is_write THEN 300  ELSE 5000 END;
    hour_limit := CASE WHEN _is_write THEN 60   ELSE 800  END;
  ELSE
    tier := 'trial';
    day_limit  := CASE WHEN _is_write THEN 5  ELSE 40 END;
    hour_limit := CASE WHEN _is_write THEN 2  ELSE 10 END;
  END IF;

  SELECT count(*) INTO day_used
    FROM public.mcp_call_log
   WHERE identity = _identity
     AND (CASE WHEN _is_write THEN is_write ELSE NOT is_write END)
     AND created_at > now() - interval '24 hours';

  SELECT count(*) INTO hour_used
    FROM public.mcp_call_log
   WHERE identity = _identity
     AND (CASE WHEN _is_write THEN is_write ELSE NOT is_write END)
     AND created_at > now() - interval '1 hour';

  IF day_used >= day_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'tier', tier, 'window', 'day',
      'limit', day_limit, 'used', day_used,
      'reason', CASE WHEN tier = 'trial' THEN 'trial_daily_limit_reached'
                     WHEN tier = 'anonymous' THEN 'anonymous_daily_limit_reached'
                     ELSE 'daily_limit_reached' END
    );
  END IF;

  IF hour_used >= hour_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'tier', tier, 'window', 'hour',
      'limit', hour_limit, 'used', hour_used,
      'reason', CASE WHEN tier = 'trial' THEN 'trial_hourly_limit_reached'
                     WHEN tier = 'anonymous' THEN 'anonymous_hourly_limit_reached'
                     ELSE 'hourly_limit_reached' END
    );
  END IF;

  INSERT INTO public.mcp_call_log (user_id, identity, tool_name, is_write)
    VALUES (_user_id, _identity, _tool_name, COALESCE(_is_write,false));

  RETURN jsonb_build_object(
    'allowed', true,
    'tier', tier,
    'day_limit', day_limit, 'day_used', day_used + 1, 'day_remaining', day_limit - day_used - 1,
    'hour_limit', hour_limit, 'hour_used', hour_used + 1, 'hour_remaining', hour_limit - hour_used - 1
  );
END $$;

GRANT EXECUTE ON FUNCTION public.mcp_check_and_log_call(uuid, text, text, boolean) TO anon, authenticated, service_role;
