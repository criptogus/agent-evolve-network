CREATE INDEX IF NOT EXISTS mcp_funnel_events_is_bot_idx
  ON public.mcp_funnel_events (((props->>'is_bot')));

CREATE OR REPLACE FUNCTION public.mcp_funnel_summary(
  _days integer DEFAULT 7,
  _exclude_bots boolean DEFAULT true
)
RETURNS TABLE(event text, count bigint, distinct_users bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.event,
    count(*) AS count,
    count(DISTINCT COALESCE(e.user_id::text, e.anon_hash)) AS distinct_users
  FROM public.mcp_funnel_events e
  WHERE e.created_at > now() - make_interval(days => GREATEST(_days, 1))
    AND (NOT _exclude_bots OR COALESCE(e.props->>'is_bot','false') <> 'true')
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  GROUP BY e.event
  ORDER BY count DESC;
$$;

CREATE OR REPLACE FUNCTION public.mcp_funnel_traffic_breakdown(
  _days integer DEFAULT 7
)
RETURNS TABLE(
  event text,
  human_count bigint,
  bot_count bigint,
  human_distinct bigint,
  bot_distinct bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.event,
    count(*) FILTER (WHERE COALESCE(e.props->>'is_bot','false') <> 'true') AS human_count,
    count(*) FILTER (WHERE COALESCE(e.props->>'is_bot','false') = 'true') AS bot_count,
    count(DISTINCT COALESCE(e.user_id::text, e.anon_hash))
      FILTER (WHERE COALESCE(e.props->>'is_bot','false') <> 'true') AS human_distinct,
    count(DISTINCT COALESCE(e.user_id::text, e.anon_hash))
      FILTER (WHERE COALESCE(e.props->>'is_bot','false') = 'true') AS bot_distinct
  FROM public.mcp_funnel_events e
  WHERE e.created_at > now() - make_interval(days => GREATEST(_days, 1))
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  GROUP BY e.event
  ORDER BY (count(*) FILTER (WHERE COALESCE(e.props->>'is_bot','false') <> 'true')) DESC;
$$;

CREATE OR REPLACE FUNCTION public.mcp_funnel_ua_families(
  _days integer DEFAULT 7,
  _limit integer DEFAULT 20
)
RETURNS TABLE(ua_family text, is_bot boolean, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(e.props->>'ua_family','unknown') AS ua_family,
    COALESCE(e.props->>'is_bot','false') = 'true' AS is_bot,
    count(*) AS count
  FROM public.mcp_funnel_events e
  WHERE e.created_at > now() - make_interval(days => GREATEST(_days, 1))
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  GROUP BY 1, 2
  ORDER BY count DESC
  LIMIT GREATEST(_limit, 1);
$$;