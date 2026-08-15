CREATE OR REPLACE FUNCTION public.crm_activity_hours(_user_id uuid, _days integer DEFAULT 90)
RETURNS TABLE(hour smallint, events bigint, usage_events bigint, sync_events bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT h::smallint,
         count(*)::bigint,
         count(*) FILTER (WHERE kind = 'usage')::bigint,
         count(*) FILTER (WHERE kind = 'sync')::bigint
  FROM (
    SELECT EXTRACT(HOUR FROM c.created_at) h, 'usage' AS kind FROM public.mcp_call_log c
      WHERE c.user_id = _user_id AND c.created_at > now() - make_interval(days => GREATEST(1, _days))
    UNION ALL
    SELECT EXTRACT(HOUR FROM x.created_at) h, 'usage' FROM public.skill_executions x
      WHERE x.user_id = _user_id AND x.created_at > now() - make_interval(days => GREATEST(1, _days))
    UNION ALL
    SELECT EXTRACT(HOUR FROM e.created_at) h, 'usage' FROM public.package_evaluations e
      WHERE e.triggered_by = _user_id AND e.created_at > now() - make_interval(days => GREATEST(1, _days))
    UNION ALL
    SELECT EXTRACT(HOUR FROM s.created_at) h, 'sync' FROM public.cloud_skill_sync_events s
      WHERE s.user_id = _user_id AND s.created_at > now() - make_interval(days => GREATEST(1, _days))
    UNION ALL
    SELECT EXTRACT(HOUR FROM k.created_at) h, 'sync' FROM public.cloud_skill_sync_conflicts k
      WHERE k.user_id = _user_id AND k.created_at > now() - make_interval(days => GREATEST(1, _days))
  ) s
  GROUP BY 1
  ORDER BY 2 DESC
$function$;

REVOKE ALL ON FUNCTION public.crm_activity_hours(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_activity_hours(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_segment_send_hour_stats(_days integer DEFAULT 120)
RETURNS TABLE(tool_id text, usage_pattern text, send_hour smallint, sent bigint, engaged bigint, converted bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(l.tool_id, 'unknown'),
         COALESCE(l.usage_pattern, 'unknown'),
         l.send_hour,
         count(*)::bigint,
         count(COALESCE(o.clicked_at, o.opened_at))::bigint,
         count(o.converted_at)::bigint
  FROM public.crm_message_log l
  LEFT JOIN public.crm_message_outcomes o ON o.message_log_id = l.id
  WHERE l.send_hour IS NOT NULL
    AND l.created_at > now() - make_interval(days => GREATEST(1, _days))
    AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3
$function$;

REVOKE ALL ON FUNCTION public.crm_segment_send_hour_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_segment_send_hour_stats(integer) TO service_role;