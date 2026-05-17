-- SkillForge: versioned golden set + judge meta-evaluation + evolutionary auto-learn support.

-- 1) Golden set: frozen, human/reference-labelled ground-truth cases that travel
--    with the PACKAGE (not regenerated per eval). Used as a stable regression
--    suite so "no regression" is measured against a fixed bar, and as the
--    reference labels for judge calibration.
CREATE TABLE public.package_golden_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  origin_version_id UUID REFERENCES public.package_versions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  -- Ground-truth verdict for this case. The judge's per-case pass/fail is
  -- compared against this to compute calibration (judge-vs-truth agreement).
  label_pass BOOLEAN NOT NULL DEFAULT true,
  label_source TEXT NOT NULL DEFAULT 'reference' CHECK (label_source IN ('human','reference','imported')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  frozen BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_golden_cases_pkg ON public.package_golden_cases(package_id, is_active);
ALTER TABLE public.package_golden_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "golden read public"
  ON public.package_golden_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_id
      AND (p.is_published OR p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

CREATE POLICY "golden author write"
  ON public.package_golden_cases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_id
      AND (p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

-- 2) Judge calibration: persist how well the LLM judge ensemble agreed with the
--    golden labels for each evaluation, so the score itself is auditable.
ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS judge_calibration JSONB;

-- 3) Auto-learn evolution trace: store the per-generation elite archive so the
--    UI can show the search, not just the final patch.
ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS evolution_trace JSONB;

-- Seed the golden set from each package's current version examples as
-- 'reference' labels (label_pass = true). Authors can later correct labels or
-- mark cases human-verified; frozen cases are no longer mutated by authoring.
INSERT INTO public.package_golden_cases (package_id, origin_version_id, title, input, expected_output, label_pass, label_source)
SELECT pv.package_id,
       pv.id,
       COALESCE(ex->>'title', 'case'),
       COALESCE(ex->>'input', ''),
       COALESCE(ex->>'expected_output', ''),
       true,
       'reference'
FROM (
  SELECT DISTINCT ON (package_id) package_id, id, examples
  FROM public.package_versions
  ORDER BY package_id, created_at DESC
) pv
CROSS JOIN LATERAL jsonb_array_elements(pv.examples) AS ex
WHERE COALESCE(ex->>'input','') <> '' AND COALESCE(ex->>'expected_output','') <> '';
