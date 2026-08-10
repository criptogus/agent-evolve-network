CREATE OR REPLACE FUNCTION public.crm_customers(_limit INTEGER DEFAULT 500, _offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  handle TEXT,
  signed_up_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  plan_slug TEXT,
  sub_status TEXT,
  price_cents INTEGER,
  sub_environment TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  mcp_token_count INTEGER,
  mcp_last_used_at TIMESTAMPTZ,
  mcp_call_count INTEGER,
  mcp_last_call_at TIMESTAMPTZ,
  review_count INTEGER,
  last_review_at TIMESTAMPTZ,
  upload_count INTEGER,
  agent_count INTEGER,
  diagnosis_count INTEGER,
  residency_count INTEGER,
  cloud_skill_count INTEGER,
  install_count INTEGER,
  package_count INTEGER,
  credits_spent INTEGER,
  executions_30d INTEGER,
  last_active_at TIMESTAMPTZ,
  stage TEXT,
  crm_unsubscribed BOOLEAN,
  last_email_at TIMESTAMPTZ,
  emails_sent_7d INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH subs AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.plan_slug, s.status, s.price_cents,
           s.environment, s.current_period_end, s.cancel_at_period_end
    FROM public.subscriptions s
    ORDER BY s.user_id,
      (CASE WHEN s.status IN ('active','trialing') THEN 0 ELSE 1 END),
      s.updated_at DESC NULLS LAST
  )
  SELECT
    u.id,
    u.email::text,
    p.display_name,
    p.handle,
    u.created_at,
    u.last_sign_in_at,
    subs.plan_slug,
    subs.status,
    subs.price_cents,
    subs.environment,
    subs.current_period_end,
    subs.cancel_at_period_end,
    COALESCE(tok.n, 0)::int,
    tok.last_used_at,
    COALESCE(calls.n, 0)::int,
    calls.last_at,
    COALESCE(ev.n, 0)::int,
    ev.last_at,
    COALESCE(up.n, 0)::int,
    COALESCE(ab.n, 0)::int,
    COALESCE(dg.n, 0)::int,
    COALESCE(rs.n, 0)::int,
    COALESCE(cs.n, 0)::int,
    COALESCE(ins.n, 0)::int,
    COALESCE(pk.n, 0)::int,
    COALESCE(cr.spent, 0)::int,
    COALESCE(ex.n, 0)::int,
    GREATEST(
      COALESCE(u.last_sign_in_at, u.created_at),
      COALESCE(calls.last_at, u.created_at),
      COALESCE(ev.last_at, u.created_at),
      COALESCE(tok.last_used_at, u.created_at),
      COALESCE(ex.last_at, u.created_at)
    ),
    COALESCE(st.stage, 'new'),
    COALESCE(st.crm_unsubscribed, false),
    st.last_email_at,
    COALESCE(st.emails_sent_7d, 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN subs ON subs.user_id = u.id
  LEFT JOIN public.crm_lifecycle_state st ON st.user_id = u.id
  LEFT JOIN (SELECT t.user_id, count(*) n, max(t.last_used_at) last_used_at FROM public.mcp_tokens t GROUP BY 1) tok ON tok.user_id = u.id
  LEFT JOIN (SELECT c.user_id, count(*) n, max(c.created_at) last_at FROM public.mcp_call_log c GROUP BY 1) calls ON calls.user_id = u.id
  LEFT JOIN (SELECT e.triggered_by AS user_id, count(*) n, max(e.created_at) last_at FROM public.package_evaluations e WHERE e.triggered_by IS NOT NULL GROUP BY 1) ev ON ev.user_id = u.id
  LEFT JOIN (SELECT j.user_id, count(*) n FROM public.package_upload_jobs j GROUP BY 1) up ON up.user_id = u.id
  LEFT JOIN (SELECT b.user_id, count(*) n FROM public.agent_builds b GROUP BY 1) ab ON ab.user_id = u.id
  LEFT JOIN (SELECT d.user_id, count(*) n FROM public.agent_diagnoses d GROUP BY 1) dg ON dg.user_id = u.id
  LEFT JOIN (SELECT r.user_id, count(*) n FROM public.agent_residencies r GROUP BY 1) rs ON rs.user_id = u.id
  LEFT JOIN (SELECT k.user_id, count(*) n FROM public.cloud_skills k GROUP BY 1) cs ON cs.user_id = u.id
  LEFT JOIN (SELECT i.user_id, count(*) n FROM public.package_installs i GROUP BY 1) ins ON ins.user_id = u.id
  LEFT JOIN (SELECT g.author_id AS user_id, count(*) n FROM public.packages g WHERE g.author_id IS NOT NULL GROUP BY 1) pk ON pk.user_id = u.id
  LEFT JOIN (SELECT l.user_id, SUM(GREATEST(-l.delta, 0)) spent FROM public.credit_ledger l GROUP BY 1) cr ON cr.user_id = u.id
  LEFT JOIN (
    SELECT x.user_id, count(*) n, max(x.created_at) last_at
    FROM public.skill_executions x
    WHERE x.user_id IS NOT NULL AND x.created_at > now() - INTERVAL '30 days'
    GROUP BY 1
  ) ex ON ex.user_id = u.id
  WHERE auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
  LIMIT _limit OFFSET _offset
$$;

REVOKE ALL ON FUNCTION public.crm_customers(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_customers(INTEGER, INTEGER) TO authenticated, service_role;