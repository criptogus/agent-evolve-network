CREATE TABLE public.plugin_conformance_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users,
  filename TEXT NOT NULL,
  plugin_name TEXT,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  conformant BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  report JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plugin_conformance_runs TO authenticated;
GRANT ALL ON public.plugin_conformance_runs TO service_role;

ALTER TABLE public.plugin_conformance_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read conformance runs"
  ON public.plugin_conformance_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can record conformance runs"
  ON public.plugin_conformance_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE INDEX plugin_conformance_runs_created_at_idx
  ON public.plugin_conformance_runs (created_at DESC);