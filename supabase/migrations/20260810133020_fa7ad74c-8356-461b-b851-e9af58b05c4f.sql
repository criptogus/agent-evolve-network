-- 1. Track every CRM message: variant, timing, tracking token
ALTER TABLE public.crm_message_log
  ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS send_hour SMALLINT,
  ADD COLUMN IF NOT EXISTS stage_at_send TEXT,
  ADD COLUMN IF NOT EXISTS cta_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS crm_message_log_tracking_token_key
  ON public.crm_message_log (tracking_token) WHERE tracking_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_message_log_trigger_variant_idx
  ON public.crm_message_log (trigger, variant, created_at DESC);

-- 2. Outcome per message
CREATE TABLE IF NOT EXISTS public.crm_message_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_log_id UUID NOT NULL UNIQUE REFERENCES public.crm_message_log(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trigger TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'v1',
  send_hour SMALLINT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  conversion_kind TEXT,
  unsubscribed_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  window_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.crm_message_outcomes TO service_role;
GRANT SELECT ON public.crm_message_outcomes TO authenticated;
ALTER TABLE public.crm_message_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_outcomes_admin_read" ON public.crm_message_outcomes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS crm_message_outcomes_open_window_idx
  ON public.crm_message_outcomes (window_closed, created_at DESC);

-- 3. Copy variant registry (bandit arms)
CREATE TABLE IF NOT EXISTS public.crm_copy_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger TEXT NOT NULL,
  variant TEXT NOT NULL,
  label TEXT NOT NULL,
  framing TEXT NOT NULL DEFAULT 'roi',
  status TEXT NOT NULL DEFAULT 'active',
  subject_override TEXT,
  heading_override TEXT,
  intro_override TEXT,
  origin TEXT NOT NULL DEFAULT 'builtin',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trigger, variant)
);
GRANT ALL ON public.crm_copy_variants TO service_role;
GRANT SELECT ON public.crm_copy_variants TO authenticated;
ALTER TABLE public.crm_copy_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_variants_admin_read" ON public.crm_copy_variants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Auto-tuning changelog
CREATE TABLE IF NOT EXISTS public.crm_tuning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  trigger TEXT,
  variant TEXT,
  reason TEXT NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.crm_tuning_log TO service_role;
GRANT SELECT ON public.crm_tuning_log TO authenticated;
ALTER TABLE public.crm_tuning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tuning_admin_read" ON public.crm_tuning_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. CRM settings (learning on/off, thresholds)
CREATE TABLE IF NOT EXISTS public.crm_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.crm_settings TO service_role;
GRANT SELECT ON public.crm_settings TO authenticated;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_settings_admin_read" ON public.crm_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.crm_settings (key, value)
VALUES ('learning', '{"enabled": true, "min_samples": 20}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Tracking writers: token-scoped, no PII, callable by anon (pixel/redirect)
CREATE OR REPLACE FUNCTION public.crm_track_open(_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m RECORD;
BEGIN
  SELECT id, user_id, trigger, variant, send_hour INTO m
  FROM public.crm_message_log WHERE tracking_token = _token;
  IF m.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.crm_message_outcomes (message_log_id, user_id, trigger, variant, send_hour, opened_at)
  VALUES (m.id, m.user_id, m.trigger, m.variant, m.send_hour, now())
  ON CONFLICT (message_log_id) DO UPDATE
    SET opened_at = COALESCE(public.crm_message_outcomes.opened_at, now()), updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.crm_track_open(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_track_open(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crm_track_click(_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m RECORD;
BEGIN
  SELECT id, user_id, trigger, variant, send_hour, cta_path INTO m
  FROM public.crm_message_log WHERE tracking_token = _token;
  IF m.id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.crm_message_outcomes (message_log_id, user_id, trigger, variant, send_hour, opened_at, clicked_at)
  VALUES (m.id, m.user_id, m.trigger, m.variant, m.send_hour, now(), now())
  ON CONFLICT (message_log_id) DO UPDATE
    SET opened_at = COALESCE(public.crm_message_outcomes.opened_at, now()),
        clicked_at = COALESCE(public.crm_message_outcomes.clicked_at, now()),
        updated_at = now();
  RETURN m.cta_path;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_track_click(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_track_click(TEXT) TO anon, authenticated, service_role;

-- 7. Effectiveness aggregates for the admin dashboard
CREATE OR REPLACE FUNCTION public.crm_effectiveness(_days INTEGER DEFAULT 90)
RETURNS TABLE (
  trigger TEXT,
  variant TEXT,
  sent BIGINT,
  opened BIGINT,
  clicked BIGINT,
  converted BIGINT,
  unsubscribed BIGINT,
  last_sent_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.trigger,
         l.variant,
         count(*)::bigint,
         count(o.opened_at)::bigint,
         count(o.clicked_at)::bigint,
         count(o.converted_at)::bigint,
         count(o.unsubscribed_at)::bigint,
         max(l.created_at)
  FROM public.crm_message_log l
  LEFT JOIN public.crm_message_outcomes o ON o.message_log_id = l.id
  WHERE l.created_at > now() - make_interval(days => GREATEST(1, _days))
    AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
  GROUP BY 1, 2
$$;
REVOKE ALL ON FUNCTION public.crm_effectiveness(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_effectiveness(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crm_send_hour_stats(_days INTEGER DEFAULT 90)
RETURNS TABLE (send_hour SMALLINT, sent BIGINT, engaged BIGINT, converted BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.send_hour,
         count(*)::bigint,
         count(COALESCE(o.clicked_at, o.opened_at))::bigint,
         count(o.converted_at)::bigint
  FROM public.crm_message_log l
  LEFT JOIN public.crm_message_outcomes o ON o.message_log_id = l.id
  WHERE l.send_hour IS NOT NULL
    AND l.created_at > now() - make_interval(days => GREATEST(1, _days))
    AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
  GROUP BY 1
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.crm_send_hour_stats(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_send_hour_stats(INTEGER) TO authenticated, service_role;

-- 8. Per-customer active-hour profile (UTC hours of real product activity)
CREATE OR REPLACE FUNCTION public.crm_active_hours(_user_id UUID)
RETURNS TABLE (hour SMALLINT, events BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h::smallint, count(*)::bigint FROM (
    SELECT EXTRACT(HOUR FROM c.created_at) h FROM public.mcp_call_log c
      WHERE c.user_id = _user_id AND c.created_at > now() - INTERVAL '90 days'
    UNION ALL
    SELECT EXTRACT(HOUR FROM x.created_at) h FROM public.skill_executions x
      WHERE x.user_id = _user_id AND x.created_at > now() - INTERVAL '90 days'
    UNION ALL
    SELECT EXTRACT(HOUR FROM e.created_at) h FROM public.package_evaluations e
      WHERE e.triggered_by = _user_id AND e.created_at > now() - INTERVAL '90 days'
  ) s
  GROUP BY 1
  ORDER BY 2 DESC
$$;
REVOKE ALL ON FUNCTION public.crm_active_hours(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_active_hours(UUID) TO service_role;