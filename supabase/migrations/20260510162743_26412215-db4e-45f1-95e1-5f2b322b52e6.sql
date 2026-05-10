
CREATE TABLE public.package_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL,
  version_id UUID,
  triggered_by UUID,
  trigger_kind TEXT NOT NULL DEFAULT 'manual',
  overall_score NUMERIC,
  precision_score NUMERIC,
  health_score NUMERIC,
  hallucination_rate NUMERIC,
  safety_score NUMERIC,
  verdict TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvement_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  adversarial_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  pipeline_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_evaluations_pkg ON public.package_evaluations(package_id, created_at DESC);

ALTER TABLE public.package_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations public read"
ON public.package_evaluations FOR SELECT
USING (EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_evaluations.package_id AND (p.is_published OR p.author_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE POLICY "evaluations auth insert"
ON public.package_evaluations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "evaluations admin delete"
ON public.package_evaluations FOR DELETE
USING (has_role(auth.uid(),'admin'));

-- Track auto-creation requests resolved automatically (no admin)
ALTER TABLE public.package_requests
  ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN NOT NULL DEFAULT false;
