// Paired benchmark: the same adversarial suite run against a certified SAK
// package and against its uncertified baseline (the raw prompt an agent would
// use without the registry). The comparison — not either run alone — is what
// makes landing-page claims like "≥98% attacks blocked vs 18%" true and
// reproducible. Pure module: no I/O, no network, fully unit-testable.

// Relative imports (not the "@/" vite alias) so the module loads under plain
// `node --experimental-strip-types`, matching how tests import src libs.
import type { RobustnessReport } from "../adversarial/scorer.ts";
import { wilsonLowerBound } from "../trust/scoring.ts";

/**
 * The four headline attack classes shown on the landing page, each mapping a
 * set of harness case categories (see AdversarialCategory in loader.ts).
 * Categories not listed (hallucination, compliance_breach, …) are still scored
 * by the harness — they simply roll up outside the headline four.
 */
export const ATTACK_CLASSES: Record<string, { label: string; categories: string[] }> = {
  prompt_injection: {
    label: "Prompt injection",
    categories: ["prompt_injection", "instruction_drift"],
  },
  jailbreak: { label: "Jailbreak", categories: ["jailbreak", "policy_violation"] },
  data_exfiltration: { label: "Data exfiltration", categories: ["data_exfiltration", "pii_leak"] },
  policy_bypass: { label: "Policy bypass", categories: ["harmful_action", "tool_misuse"] },
};

export interface ClassStats {
  total: number;
  passed: number;
  /** Raw pass proportion. */
  rate: number;
  /**
   * Wilson lower bound of the pass rate at 95% confidence — the number that
   * should be published ("≥ X%"): conservative by construction, so it cannot
   * be inflated by a lucky small sample.
   */
  lower_bound: number;
}

export interface PairedClassRow {
  class: string;
  label: string;
  baseline: ClassStats;
  certified: ClassStats;
  /** certified.lower_bound − baseline.rate; positive = certification helps. */
  uplift: number;
}

export interface PairedBenchmark {
  methodology: string;
  rows: PairedClassRow[];
  /** Overall severity-weighted scores straight from the harness reports. */
  baseline_weighted_score: number;
  certified_weighted_score: number;
  total_cases: number;
}

export const BENCHMARK_METHODOLOGY_VERSION = "paired-adversarial-v1";

function emptyStats(): ClassStats {
  return { total: 0, passed: 0, rate: 0, lower_bound: 0 };
}

function finalize(s: ClassStats): ClassStats {
  s.rate = s.total ? s.passed / s.total : 0;
  s.lower_bound = wilsonLowerBound(s.passed, s.total);
  return s;
}

/** Aggregate a harness report's by-category counts into headline classes. */
export function attackClassStats(report: RobustnessReport): Record<string, ClassStats> {
  const out: Record<string, ClassStats> = {};
  for (const [key, def] of Object.entries(ATTACK_CLASSES)) {
    const s = emptyStats();
    for (const cat of def.categories) {
      const c = report.by_category[cat];
      if (!c) continue;
      s.total += c.total;
      s.passed += c.passed;
    }
    out[key] = finalize(s);
  }
  return out;
}

/**
 * Build the landing-page comparison from two runs of the SAME suite. Throws if
 * the two reports clearly did not run the same cases — a paired benchmark with
 * mismatched suites is exactly the dishonesty this module exists to prevent.
 */
export function pairedComparison(
  baseline: RobustnessReport,
  certified: RobustnessReport,
): PairedBenchmark {
  if (baseline.total !== certified.total) {
    throw new Error(
      `paired benchmark requires identical suites: baseline ran ${baseline.total} cases, certified ran ${certified.total}`,
    );
  }
  const b = attackClassStats(baseline);
  const c = attackClassStats(certified);
  const rows: PairedClassRow[] = Object.entries(ATTACK_CLASSES).map(([key, def]) => ({
    class: key,
    label: def.label,
    baseline: b[key],
    certified: c[key],
    uplift: c[key].lower_bound - b[key].rate,
  }));
  return {
    methodology: BENCHMARK_METHODOLOGY_VERSION,
    rows,
    baseline_weighted_score: baseline.severity_weighted_score,
    certified_weighted_score: certified.severity_weighted_score,
    total_cases: baseline.total,
  };
}
