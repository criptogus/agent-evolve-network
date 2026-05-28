-- SkillForge efficiency axis.
-- The evaluator now measures per-run latency and token usage during the
-- baseline stage and folds an efficiency score into the type-weighted overall
-- score. Persist the raw efficiency breakdown so the score stays auditable and
-- the UI can show "fast & cheap" alongside correctness/safety.
ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS efficiency JSONB;

COMMENT ON COLUMN public.package_evaluations.efficiency IS
  'Baseline-run efficiency: { avg_latency_ms, avg_tokens, latency_score, token_score, efficiency_score }. efficiency_score (0-100) contributes to overall_score with a small per-type weight.';
