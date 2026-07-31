CREATE TABLE public.skill_review_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doc_key TEXT NOT NULL,
  doc_hash TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'skill',
  doc_class TEXT,
  language TEXT,
  overall_score INTEGER NOT NULL,
  verdict_score INTEGER,
  format_score INTEGER,
  substance_score INTEGER,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX skill_review_runs_user_doc_idx ON public.skill_review_runs (user_id, doc_key, created_at DESC);

GRANT SELECT ON public.skill_review_runs TO authenticated;
GRANT ALL ON public.skill_review_runs TO service_role;

ALTER TABLE public.skill_review_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their own review runs"
ON public.skill_review_runs FOR SELECT TO authenticated
USING (user_id = auth.uid());