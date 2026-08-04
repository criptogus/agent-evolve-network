CREATE TABLE public.agent_diagnoses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  domain text NOT NULL,
  agent_fp text,
  status text NOT NULL DEFAULT 'open',
  case_ids text[] NOT NULL DEFAULT '{}',
  installed_skills text[] NOT NULL DEFAULT '{}',
  overall_score integer,
  error_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  prescription jsonb NOT NULL DEFAULT '[]'::jsonb,
  bottleneck text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_diagnoses_user_idx ON public.agent_diagnoses (user_id, created_at DESC);
CREATE INDEX agent_diagnoses_domain_idx ON public.agent_diagnoses (domain, created_at DESC);

GRANT SELECT, DELETE ON public.agent_diagnoses TO authenticated;
GRANT ALL ON public.agent_diagnoses TO service_role;
ALTER TABLE public.agent_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own diagnoses" ON public.agent_diagnoses
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete their own diagnoses" ON public.agent_diagnoses
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.agent_diagnosis_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_id uuid NOT NULL REFERENCES public.agent_diagnoses(id) ON DELETE CASCADE,
  case_id text NOT NULL,
  error_class text NOT NULL,
  answer text,
  passed boolean NOT NULL DEFAULT false,
  reason text,
  latency_ms integer,
  tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_diagnosis_items_diag_idx ON public.agent_diagnosis_items (diagnosis_id);

GRANT SELECT ON public.agent_diagnosis_items TO authenticated;
GRANT ALL ON public.agent_diagnosis_items TO service_role;
ALTER TABLE public.agent_diagnosis_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own diagnosis items" ON public.agent_diagnosis_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agent_diagnoses d
      WHERE d.id = agent_diagnosis_items.diagnosis_id AND d.user_id = auth.uid()
    )
  );

CREATE TRIGGER agent_diagnoses_touch
  BEFORE UPDATE ON public.agent_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();