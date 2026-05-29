-- Judge calibration telemetry on adversarial runs.
--
-- When a run is graded by the LLM judge ensemble (see src/lib/adversarial/),
-- persist how the judge agreed with the deterministic grader. A falling κ means
-- the two are diverging and the judge likely needs recalibration against golden
-- labels — an auditable drift signal for the Trust Score pipeline.
-- Additive and safe to re-run.

alter table public.adversarial_runs
  add column if not exists judge_model text,
  add column if not exists judge_cases int,
  add column if not exists judge_overrides int,
  add column if not exists judge_agreement numeric(5,4),
  add column if not exists judge_kappa numeric(5,4);
