ALTER TABLE public.crm_message_log
  ADD COLUMN IF NOT EXISTS tool_id TEXT,
  ADD COLUMN IF NOT EXISTS usage_pattern TEXT;

CREATE INDEX IF NOT EXISTS crm_message_log_segment_idx
  ON public.crm_message_log (tool_id, usage_pattern, trigger, created_at DESC);

CREATE OR REPLACE FUNCTION public.crm_effectiveness_by_segment(_days INTEGER DEFAULT 120)
RETURNS TABLE (
  trigger TEXT,
  variant TEXT,
  tool_id TEXT,
  usage_pattern TEXT,
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
         COALESCE(l.tool_id, 'unknown'),
         COALESCE(l.usage_pattern, 'unknown'),
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
  GROUP BY 1, 2, 3, 4
$$;
REVOKE ALL ON FUNCTION public.crm_effectiveness_by_segment(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_effectiveness_by_segment(INTEGER) TO authenticated, service_role;