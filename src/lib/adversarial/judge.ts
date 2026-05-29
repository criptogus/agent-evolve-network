/**
 * LLM-judge + agreement calibration for the adversarial harness.
 *
 * The deterministic grader (scorer.ts) is fast and cheap but blind to meaning:
 * it can pass an output that contains a required token while still doing the
 * harmful thing, or fail a correct refusal phrased outside its regex set.
 * This module adds a rubric-driven LLM judge *alongside* the deterministic
 * checks, and the machinery to prove the judge is trustworthy by measuring its
 * agreement (Cohen's κ) with golden human labels.
 *
 * The judge itself is injected as a `JudgeFn`, so this module is pure and fully
 * unit-testable with a mock judge — no live model required.
 * See docs/product/EVALUATION-ALGORITHM-ANALYSIS.md (#6).
 */

export type Verdict = "pass" | "fail";

export interface JudgeRubric {
  /** What a correct/safe answer must do. */
  criteria: string[];
  /** Hard failure conditions the judge must flag even if criteria are met. */
  hard_fail?: string[];
}

export interface JudgeResult {
  verdict: Verdict;
  rationale: string;
  /** Judge's self-reported confidence in [0,1]. Optional. */
  confidence?: number;
}

export interface JudgeRequest {
  caseId: string;
  input: string;
  output: string;
  rubric: JudgeRubric;
}

/** Pluggable judge — wrap any model behind this signature. */
export type JudgeFn = (req: JudgeRequest) => Promise<JudgeResult>;

export type EnsembleMode = "strict" | "lenient";

export interface EnsembleOutcome {
  passed: boolean;
  /** True when the deterministic grader and the judge disagree. */
  disagreement: boolean;
  deterministic: Verdict;
  judge: Verdict;
  rationale: string;
}

/**
 * Combine the deterministic outcome with the judge verdict.
 *
 * - "strict" (default, recommended for safety): pass only if BOTH agree it
 *   passes. The judge can therefore *catch* semantic failures the substring
 *   check missed, raising the safety bar without ever lowering it.
 * - "lenient": pass if EITHER passes — useful for competence axes where the
 *   deterministic check is overly literal, not for safety.
 */
export function ensembleVerdict(
  deterministicPassed: boolean,
  judge: JudgeResult,
  mode: EnsembleMode = "strict",
): EnsembleOutcome {
  const det: Verdict = deterministicPassed ? "pass" : "fail";
  const jud: Verdict = judge.verdict;
  const passed = mode === "strict" ? det === "pass" && jud === "pass" : det === "pass" || jud === "pass";
  return {
    passed,
    disagreement: det !== jud,
    deterministic: det,
    judge: jud,
    rationale: judge.rationale,
  };
}

export interface CalibrationReport {
  n: number;
  /** Raw proportion of cases where judge and human agree. */
  agreement: number;
  /** Cohen's κ — agreement corrected for chance. 1 = perfect, 0 = chance. */
  kappa: number;
  /** Cases where the judge said pass but the human said fail (dangerous). */
  false_pass: number;
  /** Cases where the judge said fail but the human said pass (annoying). */
  false_fail: number;
}

/**
 * Cohen's κ for two raters over binary verdicts. Returns 1 for identical
 * label vectors (including the degenerate single-category case), and is
 * clamped to [-1, 1]. Throws on length mismatch.
 */
export function cohenKappa(a: Verdict[], b: Verdict[]): number {
  if (a.length !== b.length) throw new Error("rater vectors must be equal length");
  const n = a.length;
  if (n === 0) return 1;

  let agree = 0;
  const countA = { pass: 0, fail: 0 };
  const countB = { pass: 0, fail: 0 };
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    countA[a[i]]++;
    countB[b[i]]++;
  }
  const po = agree / n;
  const pe =
    (countA.pass / n) * (countB.pass / n) + (countA.fail / n) * (countB.fail / n);
  if (pe >= 1) return po >= 1 ? 1 : 0; // both raters all one category
  const kappa = (po - pe) / (1 - pe);
  return Math.max(-1, Math.min(1, kappa));
}

/**
 * Measure how trustworthy the judge is against golden human labels.
 * `human` and `judge` must be aligned, equal-length verdict vectors.
 */
export function judgeCalibration(human: Verdict[], judge: Verdict[]): CalibrationReport {
  if (human.length !== judge.length) throw new Error("label vectors must be equal length");
  const n = human.length;
  let agree = 0;
  let falsePass = 0;
  let falseFail = 0;
  for (let i = 0; i < n; i++) {
    if (human[i] === judge[i]) agree++;
    else if (judge[i] === "pass" && human[i] === "fail") falsePass++;
    else if (judge[i] === "fail" && human[i] === "pass") falseFail++;
  }
  return {
    n,
    agreement: n ? agree / n : 1,
    kappa: cohenKappa(human, judge),
    false_pass: falsePass,
    false_fail: falseFail,
  };
}

/**
 * Run the judge over a batch and produce ensemble outcomes. The judge is awaited
 * sequentially to keep rate-limit behavior predictable; callers can batch.
 */
export async function judgeBatch(
  judgeFn: JudgeFn,
  items: Array<{ req: JudgeRequest; deterministicPassed: boolean }>,
  mode: EnsembleMode = "strict",
): Promise<EnsembleOutcome[]> {
  const out: EnsembleOutcome[] = [];
  for (const it of items) {
    const verdict = await judgeFn(it.req);
    out.push(ensembleVerdict(it.deterministicPassed, verdict, mode));
  }
  return out;
}
