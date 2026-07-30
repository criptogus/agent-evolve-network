-- 1. Outcome + experiment columns on skill_executions
ALTER TABLE public.skill_executions
  ADD COLUMN IF NOT EXISTS arm text,
  ADD COLUMN IF NOT EXISTS experiment_key text,
  ADD COLUMN IF NOT EXISTS task_completed boolean,
  ADD COLUMN IF NOT EXISTS human_intervention boolean,
  ADD COLUMN IF NOT EXISTS user_rating smallint,
  ADD COLUMN IF NOT EXISTS baseline_latency_ms integer,
  ADD COLUMN IF NOT EXISTS baseline_tokens integer,
  ADD COLUMN IF NOT EXISTS workspace_hash text;

ALTER TABLE public.skill_executions
  DROP CONSTRAINT IF EXISTS skill_executions_arm_chk;
ALTER TABLE public.skill_executions
  ADD CONSTRAINT skill_executions_arm_chk CHECK (arm IS NULL OR arm IN ('control','treatment'));
ALTER TABLE public.skill_executions
  DROP CONSTRAINT IF EXISTS skill_executions_rating_chk;
ALTER TABLE public.skill_executions
  ADD CONSTRAINT skill_executions_rating_chk CHECK (user_rating IS NULL OR user_rating IN (-1,0,1));

CREATE INDEX IF NOT EXISTS skill_executions_slug_arm_idx
  ON public.skill_executions (package_slug, arm, created_at DESC);
CREATE INDEX IF NOT EXISTS skill_executions_workspace_idx
  ON public.skill_executions (workspace_hash, created_at DESC);

-- 2. Experiments registry
CREATE TABLE IF NOT EXISTS public.skill_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE,
  package_slug text NOT NULL,
  key text NOT NULL,
  hypothesis text,
  control_share numeric NOT NULL DEFAULT 0.1 CHECK (control_share >= 0 AND control_share <= 0.5),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_slug, key)
);

GRANT SELECT ON public.skill_experiments TO anon;
GRANT SELECT ON public.skill_experiments TO authenticated;
GRANT ALL ON public.skill_experiments TO service_role;
ALTER TABLE public.skill_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experiments readable" ON public.skill_experiments;
CREATE POLICY "experiments readable" ON public.skill_experiments
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage experiments" ON public.skill_experiments;
CREATE POLICY "admins manage experiments" ON public.skill_experiments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS touch_skill_experiments ON public.skill_experiments;
CREATE TRIGGER touch_skill_experiments BEFORE UPDATE ON public.skill_experiments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Execution reporting with outcome + arm
DROP FUNCTION IF EXISTS public.report_skill_execution(text, boolean, text, text, integer, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.report_skill_execution(
  _slug text,
  _success boolean,
  _model text DEFAULT NULL,
  _version text DEFAULT NULL,
  _latency_ms integer DEFAULT NULL,
  _tokens_in integer DEFAULT NULL,
  _tokens_out integer DEFAULT NULL,
  _error_kind text DEFAULT NULL,
  _agent_fp text DEFAULT NULL,
  _arm text DEFAULT NULL,
  _experiment_key text DEFAULT NULL,
  _task_completed boolean DEFAULT NULL,
  _human_intervention boolean DEFAULT NULL,
  _user_rating smallint DEFAULT NULL,
  _baseline_latency_ms integer DEFAULT NULL,
  _baseline_tokens integer DEFAULT NULL,
  _workspace_hash text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  pkg_id uuid;
  recent int;
  uid uuid := auth.uid();
  exec_id uuid;
begin
  if _slug is null or length(_slug) = 0 then
    raise exception 'INVALID_SLUG';
  end if;
  if _arm is not null and _arm not in ('control','treatment') then
    raise exception 'INVALID_ARM';
  end if;

  select id into pkg_id from public.packages
   where slug = _slug and is_published = true limit 1;
  if pkg_id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;

  if _agent_fp is not null then
    select count(*) into recent from public.skill_executions
      where agent_fp = _agent_fp and created_at > now() - interval '60 seconds';
    if recent >= 60 then raise exception 'RATE_LIMIT'; end if;
  elsif uid is not null then
    select count(*) into recent from public.skill_executions
      where user_id = uid and created_at > now() - interval '60 seconds';
    if recent >= 120 then raise exception 'RATE_LIMIT'; end if;
  end if;

  insert into public.skill_executions
    (package_id, package_slug, version, model, success, latency_ms,
     tokens_in, tokens_out, error_kind, agent_fp, user_id,
     arm, experiment_key, task_completed, human_intervention, user_rating,
     baseline_latency_ms, baseline_tokens, workspace_hash)
  values
    (pkg_id, _slug, _version, _model,
     coalesce(_success,false),
     greatest(coalesce(_latency_ms,0),0),
     greatest(coalesce(_tokens_in,0),0),
     greatest(coalesce(_tokens_out,0),0),
     nullif(_error_kind,''), nullif(_agent_fp,''), uid,
     _arm, nullif(_experiment_key,''), _task_completed, _human_intervention,
     _user_rating,
     nullif(greatest(coalesce(_baseline_latency_ms,0),0),0),
     nullif(greatest(coalesce(_baseline_tokens,0),0),0),
     nullif(_workspace_hash,''))
  returning id into exec_id;

  return exec_id;
end $function$;

GRANT EXECUTE ON FUNCTION public.report_skill_execution(text, boolean, text, text, integer, integer, integer, text, text, text, text, boolean, boolean, smallint, integer, integer, text) TO anon, authenticated, service_role;

-- 4. Late outcome attachment (owner of the execution only)
CREATE OR REPLACE FUNCTION public.attach_execution_outcome(
  _execution_id uuid,
  _task_completed boolean DEFAULT NULL,
  _human_intervention boolean DEFAULT NULL,
  _user_rating smallint DEFAULT NULL,
  _agent_fp text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  row_owner uuid;
  row_fp text;
begin
  select user_id, agent_fp into row_owner, row_fp
    from public.skill_executions where id = _execution_id;
  if row_owner is null and row_fp is null then return false; end if;

  if not (
    (uid is not null and row_owner = uid)
    or (_agent_fp is not null and row_fp is not null and row_fp = _agent_fp)
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if _user_rating is not null and _user_rating not in (-1,0,1) then
    raise exception 'INVALID_RATING';
  end if;

  update public.skill_executions
     set task_completed = coalesce(_task_completed, task_completed),
         human_intervention = coalesce(_human_intervention, human_intervention),
         user_rating = coalesce(_user_rating, user_rating)
   where id = _execution_id;
  return true;
end $function$;

GRANT EXECUTE ON FUNCTION public.attach_execution_outcome(uuid, boolean, boolean, smallint, text) TO anon, authenticated, service_role;

-- 5. Counterfactual uplift counts (control vs treatment) for a package
CREATE OR REPLACE FUNCTION public.get_skill_uplift(_slug text, _days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH e AS (
    SELECT * FROM public.skill_executions
     WHERE package_slug = _slug
       AND arm IS NOT NULL
       AND created_at > now() - make_interval(days => GREATEST(coalesce(_days,30), 1))
  ), agg AS (
    SELECT arm,
           count(*)::int AS n,
           count(*) FILTER (WHERE coalesce(task_completed, success))::int AS completed,
           count(*) FILTER (WHERE human_intervention)::int AS interventions,
           count(*) FILTER (WHERE user_rating = 1)::int AS thumbs_up,
           count(*) FILTER (WHERE user_rating = -1)::int AS thumbs_down,
           avg(latency_ms)::numeric AS avg_latency_ms,
           avg(coalesce(tokens_in,0) + coalesce(tokens_out,0))::numeric AS avg_tokens
      FROM e GROUP BY arm
  )
  SELECT jsonb_build_object(
    'slug', _slug,
    'window_days', GREATEST(coalesce(_days,30), 1),
    'arms', coalesce((
      SELECT jsonb_object_agg(arm, jsonb_build_object(
        'n', n, 'completed', completed, 'interventions', interventions,
        'thumbs_up', thumbs_up, 'thumbs_down', thumbs_down,
        'avg_latency_ms', round(coalesce(avg_latency_ms,0), 1),
        'avg_tokens', round(coalesce(avg_tokens,0), 1)
      )) FROM agg
    ), '{}'::jsonb)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_skill_uplift(text, integer) TO anon, authenticated, service_role;

-- 6. ROI per workspace (admin only)
CREATE OR REPLACE FUNCTION public.get_workspace_roi(_days integer DEFAULT 30)
RETURNS TABLE(
  workspace_hash text,
  executions bigint,
  completed bigint,
  completion_rate numeric,
  interventions bigint,
  intervention_rate numeric,
  latency_saved_ms numeric,
  tokens_saved numeric,
  guardrail_blocks bigint,
  thumbs_up bigint,
  thumbs_down bigint,
  packages_used bigint,
  last_seen timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    coalesce(e.workspace_hash, 'unknown') AS workspace_hash,
    count(*) AS executions,
    count(*) FILTER (WHERE coalesce(e.task_completed, e.success)) AS completed,
    round((count(*) FILTER (WHERE coalesce(e.task_completed, e.success)))::numeric
          / greatest(count(*), 1), 4) AS completion_rate,
    count(*) FILTER (WHERE e.human_intervention) AS interventions,
    round((count(*) FILTER (WHERE e.human_intervention))::numeric
          / greatest(count(*), 1), 4) AS intervention_rate,
    coalesce(sum(greatest(coalesce(e.baseline_latency_ms,0) - coalesce(e.latency_ms,0), 0)), 0)::numeric AS latency_saved_ms,
    coalesce(sum(greatest(coalesce(e.baseline_tokens,0)
      - (coalesce(e.tokens_in,0) + coalesce(e.tokens_out,0)), 0)), 0)::numeric AS tokens_saved,
    count(*) FILTER (WHERE e.error_kind = 'guardrail_block') AS guardrail_blocks,
    count(*) FILTER (WHERE e.user_rating = 1) AS thumbs_up,
    count(*) FILTER (WHERE e.user_rating = -1) AS thumbs_down,
    count(DISTINCT e.package_slug) AS packages_used,
    max(e.created_at) AS last_seen
  FROM public.skill_executions e
  WHERE e.created_at > now() - make_interval(days => GREATEST(coalesce(_days,30), 1))
    AND EXISTS (
      SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = 'admin'
    )
  GROUP BY coalesce(e.workspace_hash, 'unknown')
  ORDER BY count(*) DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_workspace_roi(integer) TO authenticated, service_role;