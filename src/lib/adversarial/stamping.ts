// Evidence stamping (SkillEvaluator P0 import): a partial or under-observed
// eval run must NOT be able to self-certify. The stamp records exactly which
// required checks the run satisfied; trust scoring treats a present-but-not
// certify-worthy stamp as unproven evidence. Pure module: no I/O.

// Relative imports (not the "@/" vite alias) so the module loads under plain
// `node --experimental-strip-types`.
import type { RobustnessReport } from "./scorer.ts";

export const EVIDENCE_STAMP_SCHEMA_VERSION = "sak-evidence-stamp-v1";

export interface RequiredEvidenceChecks {
  /**
   * The run covered the FULL matched suite (no vertical/tag slicing) — a
   * sampled run proves nothing about the whole.
   */
  full_suite: boolean;
  /** The run did not silently drop the private holdout subset. */
  holdout_included: boolean;
  /** The audited package passed the content-security audit (no blocking findings). */
  scan_clean: boolean;
  /** The judge identity (model, or the deterministic mock) is recorded on the report. */
  judge_source_recorded: boolean;
}

export const REQUIRED_EVIDENCE_CHECKS: ReadonlyArray<keyof RequiredEvidenceChecks> = [
  "full_suite",
  "holdout_included",
  "scan_clean",
  "judge_source_recorded",
];

export interface EvidenceStamp extends RequiredEvidenceChecks {
  schema_version: string;
  /** Human-readable reason for every failed check (empty string when passed). */
  notes: Partial<Record<keyof RequiredEvidenceChecks, string>>;
  /** True only when EVERY required check passed — the only certified state. */
  certify_worthy: boolean;
}

export interface StampOptions {
  /** How many cases the suite SHOULD have run (0 = unknown → not full). */
  expectedCases: number;
  holdoutIncluded: boolean;
  scanClean: boolean;
  /** Recorded judge identity; empty/missing fails the check. */
  judgeSource: string | null;
}

const NOTES = {
  full_suite: "run covered a subset of the matched suite (sampling does not certify)",
  holdout_included: "holdout subset was not included in the run",
  scan_clean: "content-security audit did not pass clean",
  judge_source_recorded: "judge identity is not recorded on the report",
} as const satisfies Record<keyof RequiredEvidenceChecks, string>;

/**
 * Stamp a harness report. `report.total` must equal `expectedCases` for
 * `full_suite` — extra or missing cases both fail, because a suite that
 * changed under the reporter is not the certified suite either.
 */
export function stampEvidence(
  report: Pick<RobustnessReport, "total">,
  options: StampOptions,
): EvidenceStamp {
  const checks: RequiredEvidenceChecks = {
    full_suite: options.expectedCases > 0 && report.total === options.expectedCases,
    holdout_included: options.holdoutIncluded === true,
    scan_clean: options.scanClean === true,
    judge_source_recorded:
      typeof options.judgeSource === "string" && options.judgeSource.length > 0,
  };
  const notes: EvidenceStamp["notes"] = {};
  for (const key of REQUIRED_EVIDENCE_CHECKS) {
    if (!checks[key]) notes[key] = NOTES[key];
  }
  return {
    schema_version: EVIDENCE_STAMP_SCHEMA_VERSION,
    ...checks,
    notes,
    certify_worthy: REQUIRED_EVIDENCE_CHECKS.every((k) => checks[k]),
  };
}
