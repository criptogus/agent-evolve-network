CREATE TABLE public.agent_residencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  agent_fp TEXT,
  domain TEXT NOT NULL,
  focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  round INTEGER NOT NULL DEFAULT 1,
  total_rounds INTEGER NOT NULL DEFAULT 3,
  pass_threshold INTEGER NOT NULL DEFAULT 75,
  status TEXT NOT NULL DEFAULT 'open',
  round_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_case_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  installed_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_residencies_status_chk CHECK (status IN ('open','graduated'))
);

CREATE INDEX agent_residencies_user_idx ON public.agent_residencies (user_id, created_at DESC);

GRANT SELECT ON public.agent_residencies TO authenticated;
GRANT ALL ON public.agent_residencies TO service_role;
ALTER TABLE public.agent_residencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residency_owner_select" ON public.agent_residencies
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.agent_residency_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  residency_id UUID NOT NULL REFERENCES public.agent_residencies(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_residency_rounds_res_idx ON public.agent_residency_rounds (residency_id, round);

GRANT SELECT ON public.agent_residency_rounds TO authenticated;
GRANT ALL ON public.agent_residency_rounds TO service_role;
ALTER TABLE public.agent_residency_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residency_rounds_owner_select" ON public.agent_residency_rounds
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agent_residencies r
      WHERE r.id = agent_residency_rounds.residency_id AND r.user_id = auth.uid()
    )
  );

CREATE TABLE public.agent_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  residency_id UUID REFERENCES public.agent_residencies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  domain TEXT NOT NULL,
  score INTEGER NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 0,
  focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_credentials_user_idx ON public.agent_credentials (user_id, issued_at DESC);
CREATE UNIQUE INDEX agent_credentials_active_residency_idx
  ON public.agent_credentials (residency_id) WHERE revoked = false;

GRANT SELECT ON public.agent_credentials TO authenticated;
GRANT ALL ON public.agent_credentials TO service_role;
ALTER TABLE public.agent_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credentials_owner_select" ON public.agent_credentials
  FOR SELECT TO authenticated USING (user_id = auth.uid());