CREATE TABLE public.agent_builds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  emoji text NOT NULL DEFAULT '🤖',
  tagline text,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  step text,
  research_summary text,
  research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  soul text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  playbooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  guardrails jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric,
  grade text,
  report jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX agent_builds_user_created_idx ON public.agent_builds (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_builds TO authenticated;
GRANT ALL ON public.agent_builds TO service_role;

ALTER TABLE public.agent_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own agent builds"
  ON public.agent_builds FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER agent_builds_touch_updated_at
  BEFORE UPDATE ON public.agent_builds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();