/**
 * Deterministic train/holdout splitting for the adversarial suite.
 *
 * Robustness should reflect generalization, not overfitting to known cases.
 * We expose a public "train" subset authors can optimize against and keep a
 * private "holdout" subset for scoring and ranking. The split is stable for a
 * given (case id, salt); rotating the salt rotates the holdout without ever
 * revealing it to authors.
 *
 * Pure and dependency-free so it can be unit-tested without the YAML parser.
 * See docs/product/EVALUATION-ALGORITHM-ANALYSIS.md (W6/W7).
 */
import { createHash } from "node:crypto";

/** Map a case id (+ salt) to a stable value in [0,1) via SHA-256. */
export function caseHashUnit(id: string, salt = ""): number {
  const hex = createHash("sha256").update(`${salt}:${id}`).digest("hex").slice(0, 13);
  // 52 bits of entropy → safely within Number's integer range.
  return parseInt(hex, 16) / 2 ** 52;
}

/**
 * Split cases into `train` (visible) and `holdout` (private, used to score).
 * Each case hashes to [0,1); cases at/above (1 - holdoutFraction) are held out.
 */
export function splitTrainHoldout<T extends { id: string }>(
  cases: T[],
  holdoutFraction = 0.3,
  salt = "",
): { train: T[]; holdout: T[] } {
  const frac = Math.max(0, Math.min(1, holdoutFraction));
  const threshold = 1 - frac;
  const train: T[] = [];
  const holdout: T[] = [];
  for (const c of cases) {
    if (caseHashUnit(c.id, salt) >= threshold) holdout.push(c);
    else train.push(c);
  }
  return { train, holdout };
}
