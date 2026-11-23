-- Harden the database boundaries identified by the Lovable security review.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.crm_active_hours(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_active_hours(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_activity_hours(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_activity_hours(uuid,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_customers(integer,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers(integer,integer,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_effectiveness(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_effectiveness(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_effectiveness_by_segment(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_effectiveness_by_segment(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_segment_send_hour_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_segment_send_hour_stats(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_send_hour_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_send_hour_stats(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_track_click(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_track_click(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.crm_track_open(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_track_open(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.delete_email(text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(text,bigint) TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_pack_with_items(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pack_with_items(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_package_ratings(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_package_ratings(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.list_package_reviews(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_package_reviews(uuid,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_idempotency_get(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_idempotency_get(uuid,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_idempotency_put(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_idempotency_put(uuid,text,text,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_exchange_code(text,text,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_exchange_code(text,text,text,text,text,integer,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_get_client(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_get_client(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_refresh_token(text,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_refresh_token(text,text,text,text,integer,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_register_client(text,text[],text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_register_client(text,text[],text,text,text,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_revoke_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_revoke_token(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_oauth_verify_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_verify_access(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text,text,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text,text,bigint,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text,integer,integer) TO service_role;

ALTER FUNCTION public.agent_onboarding_funnel(integer) SECURITY INVOKER;

ALTER FUNCTION public.search_packages(text,text,integer,integer) SECURITY INVOKER;

ALTER FUNCTION public.get_review_eligibility(uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.claim_referral(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text,text,text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.purchase_pack(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_pack(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.purchase_package(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_package(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.team_action(text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_action(text,uuid,jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mcp_oauth_issue_code(text,text,text,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_issue_code(text,text,text,text,text,text,integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mcp_oauth_list_user_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_list_user_connections() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mcp_oauth_revoke_client_for_user(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_revoke_client_for_user(text) TO authenticated, service_role;

ALTER FUNCTION public.delete_email(text,bigint) SET search_path = '';

ALTER FUNCTION public.enqueue_email(text,jsonb) SET search_path = '';

ALTER FUNCTION public.move_to_dlq(text,text,bigint,jsonb) SET search_path = '';

ALTER FUNCTION public.read_email_batch(text,integer,integer) SET search_path = '';

-- Public catalogue is explicit: new/internal plans are not published automatically.
ALTER POLICY "plans public read" ON public.plans USING (slug IN ('free', 'pro', 'enterprise', 'unlimited'));
CREATE POLICY "plans assigned read" ON public.plans FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.account_plans a WHERE a.plan_id = plans.id AND a.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_pack_with_items(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with p as (
    select * from public.packs where slug = _slug
      and ((is_published and review_status='approved') or author_id = auth.uid() or has_role(auth.uid(),'admin'))
  )
  select case when (select id from p) is null then null else
    jsonb_build_object(
      'pack', to_jsonb((select row_to_json(p) from p)),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'package_id', pk.id,
          'slug', pk.slug,
          'name', pk.name,
          'type', pk.type,
          'description', pk.description,
          'role', pi.role,
          'sort_order', pi.sort_order
        ) order by pi.sort_order, pk.name)
        from public.pack_items pi
        join public.packages pk on pk.id = pi.package_id
        where pi.pack_id = (select id from p)
          and pk.is_published and pk.review_status = 'approved'
      ), '[]'::jsonb),
      'owned', exists (
        select 1 from public.pack_purchases pu
        where pu.pack_id = (select id from p) and pu.buyer_id = auth.uid()
      )
    )
  end;
$function$;

CREATE OR REPLACE FUNCTION public.get_package_ratings(_package_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with agg as (
    select
      rater_kind,
      count(*)::int as cnt,
      round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews
    where package_id = _package_id and is_hidden = false
      and exists (select 1 from public.packages p where p.id = _package_id and p.is_published and p.review_status = 'approved')
    group by rater_kind
  ),
  totals as (
    select count(*)::int as cnt, round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews where package_id = _package_id and is_hidden = false
      and exists (select 1 from public.packages p where p.id = _package_id and p.is_published and p.review_status = 'approved')
  )
  select jsonb_build_object(
    'human_count',  coalesce((select cnt from agg where rater_kind='human'), 0),
    'human_avg',    coalesce((select avg_rating from agg where rater_kind='human'), 0),
    'agent_count',  coalesce((select cnt from agg where rater_kind='agent'), 0),
    'agent_avg',    coalesce((select avg_rating from agg where rater_kind='agent'), 0),
    'total_count',  coalesce((select cnt from totals), 0),
    'total_avg',    coalesce((select avg_rating from totals), 0)
  );
$function$;

CREATE OR REPLACE FUNCTION public.list_package_reviews(_package_id uuid, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, rating integer, body text, rater_kind text, verified_purchase boolean, created_at timestamp with time zone, user_id uuid, display_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.rating, r.body, r.rater_kind, r.verified_purchase, r.created_at,
         r.user_id, p.display_name, p.avatar_url
    FROM public.reviews r
    LEFT JOIN public.profiles p ON p.id = r.user_id
   WHERE r.package_id = _package_id
     AND r.is_hidden = false
     AND EXISTS (SELECT 1 FROM public.packages pk WHERE pk.id = _package_id AND pk.is_published AND pk.review_status = 'approved')
   ORDER BY r.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
$function$;


-- Exposes verdicts only, for the existing anonymous CI security gate.
CREATE OR REPLACE FUNCTION public.check_security_boundaries()
RETURNS TABLE(check_name text, passed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $audit$
WITH server_functions(signature) AS (VALUES ('public.crm_active_hours(uuid)'),
('public.crm_activity_hours(uuid,integer)'),
('public.crm_customers(integer,integer,uuid)'),
('public.crm_effectiveness(integer)'),
('public.crm_effectiveness_by_segment(integer)'),
('public.crm_segment_send_hour_stats(integer)'),
('public.crm_send_hour_stats(integer)'),
('public.crm_track_click(text)'),
('public.crm_track_open(text)'),
('public.delete_email(text,bigint)'),
('public.enqueue_email(text,jsonb)'),
('public.get_pack_with_items(text)'),
('public.get_package_ratings(uuid)'),
('public.list_package_reviews(uuid,integer)'),
('public.mcp_idempotency_get(uuid,text,text)'),
('public.mcp_idempotency_put(uuid,text,text,jsonb)'),
('public.mcp_oauth_exchange_code(text,text,text,text,text,integer,integer)'),
('public.mcp_oauth_get_client(text)'),
('public.mcp_oauth_refresh_token(text,text,text,text,integer,integer)'),
('public.mcp_oauth_register_client(text,text[],text,text,text,text,text)'),
('public.mcp_oauth_revoke_token(text)'),
('public.mcp_oauth_verify_access(text)'),
('public.move_to_dlq(text,text,bigint,jsonb)'),
('public.read_email_batch(text,integer,integer)'))
SELECT 'server_rpc_acl', count(*) = 24 AND bool_and(
  NOT pg_catalog.has_function_privilege('anon', signature, 'EXECUTE') AND
  NOT pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE') AND
  pg_catalog.has_function_privilege('service_role', signature, 'EXECUTE')) FROM server_functions
UNION ALL
SELECT 'email_search_path', count(*) = 4 AND bool_and(p.proconfig @> ARRAY['search_path=""'])
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('enqueue_email','read_email_batch','delete_email','move_to_dlq')
UNION ALL
SELECT 'rls_invoker_reads', count(*) = 3 AND bool_and(NOT p.prosecdef)
FROM pg_catalog.pg_proc p WHERE p.oid IN ('public.agent_onboarding_funnel(integer)'::pg_catalog.regprocedure,'public.search_packages(text,text,integer,integer)'::pg_catalog.regprocedure,'public.get_review_eligibility(uuid)'::pg_catalog.regprocedure)
UNION ALL
SELECT 'authenticated_transactions', count(*) = 7 AND bool_and(
 NOT pg_catalog.has_function_privilege('anon', signature, 'EXECUTE') AND
 pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE'))
FROM (VALUES ('public.claim_referral(text,text,text)'),('public.purchase_pack(uuid)'),('public.purchase_package(uuid)'),('public.team_action(text,uuid,jsonb)'),('public.mcp_oauth_issue_code(text,text,text,text,text,text,integer)'),('public.mcp_oauth_list_user_connections()'),('public.mcp_oauth_revoke_client_for_user(text)')) f(signature)
UNION ALL
SELECT 'plans_explicit_public_rows', count(*) = 1 AND bool_and(qual <> 'true' AND qual LIKE '%slug%')
FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans public read';
$audit$;
REVOKE ALL ON FUNCTION public.check_security_boundaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_security_boundaries() TO anon, authenticated, service_role;
COMMIT;

