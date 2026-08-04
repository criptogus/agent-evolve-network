CREATE TABLE public.agent_onboarding_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_hash text NOT NULL,
  step_id text NOT NULL,
  stage text NOT NULL,
  client_name text,
  ua_family text,
  is_bot boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_hash, step_id)
);

CREATE INDEX agent_onboarding_steps_created_idx ON public.agent_onboarding_steps (created_at DESC);
CREATE INDEX agent_onboarding_steps_step_idx ON public.agent_onboarding_steps (step_id);

GRANT SELECT ON public.agent_onboarding_steps TO authenticated;
GRANT ALL ON public.agent_onboarding_steps TO service_role;

ALTER TABLE public.agent_onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view onboarding steps"
  ON public.agent_onboarding_steps
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.agent_onboarding_funnel(_days integer DEFAULT 30)
RETURNS TABLE(step_id text, stage text, completions bigint, sessions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.step_id,
         max(s.stage) AS stage,
         count(*)::bigint AS completions,
         count(DISTINCT s.session_hash)::bigint AS sessions
  FROM public.agent_onboarding_steps s
  WHERE s.created_at > now() - make_interval(days => greatest(_days, 1))
    AND s.is_bot = false
  GROUP BY s.step_id;
$$;

REVOKE ALL ON FUNCTION public.agent_onboarding_funnel(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.agent_onboarding_funnel(integer) TO authenticated, service_role;