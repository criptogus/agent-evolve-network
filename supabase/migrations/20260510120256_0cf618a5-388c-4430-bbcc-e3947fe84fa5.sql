
-- Recreate view as security_invoker
DROP VIEW IF EXISTS public.package_rankings;
CREATE VIEW public.package_rankings WITH (security_invoker = true) AS
SELECT
  p.id, p.slug, p.name, p.type, p.author_handle, p.author_verified, p.description, p.latest_version, p.install_count,
  COALESCE(SUM(m.runs),0) AS total_runs,
  COALESCE(AVG(NULLIF(m.avg_health,0)),0) AS avg_health,
  COALESCE(AVG(NULLIF(m.avg_precision,0)),0) AS avg_precision,
  COALESCE(AVG(NULLIF(m.avg_hallucination,0)),0) AS avg_hallucination,
  COALESCE(AVG(NULLIF(m.avg_latency_ms,0)),0) AS avg_latency_ms,
  (
    0.4 * COALESCE(AVG(NULLIF(m.avg_precision,0))/100.0, 0)
    + 0.3 * COALESCE(AVG(NULLIF(m.avg_health,0))/100.0, 0)
    + 0.2 * LN(GREATEST(COALESCE(SUM(m.runs),0),1)+1)/8.0
    + 0.1 * (1.0 - LEAST(COALESCE(AVG(NULLIF(m.avg_hallucination,0))/10.0, 0), 1.0))
  ) AS score
FROM public.packages p
LEFT JOIN public.package_metrics_daily m ON m.package_id = p.id AND m.day >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.is_published
GROUP BY p.id;

-- Lock down internal SECURITY DEFINER functions; they're only meant for triggers / RLS, not direct calls.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_package_metrics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_review_usage() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS policies, which are evaluated as the table owner; revoke from anon but keep for authenticated (RLS still enforces row scope).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
