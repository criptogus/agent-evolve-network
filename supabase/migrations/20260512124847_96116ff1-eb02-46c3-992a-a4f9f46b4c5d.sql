
CREATE TABLE IF NOT EXISTS public.share_promos (
  type text NOT NULL CHECK (type IN ('skill','playbook','soul','guardrail','pack')),
  slug text NOT NULL,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','fallback')),
  name text,
  description text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (type, slug)
);

ALTER TABLE public.share_promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_promos public read"
  ON public.share_promos FOR SELECT
  USING (true);
