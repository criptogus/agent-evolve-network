// Outcome grader: turns the calibrated LLM judge into a *task-completion*
// grader for real executions, so `task_completed` in skill_executions can be
// filled by sampling production runs instead of trusting self-reports alone.
// This is the piece that makes "task success rate" a measured claim.
//
// Pure module — the judge is injected (JudgeFn), so everything here is
// unit-testable with a fake judge. The live judge comes from
// adversarial/judge.server.ts (getLlmJudgeOrNull).

import type { JudgeFn, JudgeResult, JudgeRubric } from "../adversarial/judge.ts";

/** The subset of a package we grade against — its declared contract. */
export interface PackageContract {
  slug: string;
  description?: string;
  /** must / must_not rules from the package YAML. */
  must?: string[];
  must_not?: string[];
  /** Worked examples: the input→output contract shipped with the package. */
  examples?: Array<{ input: string; output: string }>;
}

/**
 * Build a task-completion rubric from the package's own published contract.
 * The judge is not asked "is this a good answer?" (taste) but "did the run
 * satisfy the contract this package ships with?" (verifiable).
 */
export function contractRubric(pkg: PackageContract): JudgeRubric {
  const criteria: string[] = [
    "The output actually performs the package's stated task end-to-end — not a partial attempt, a plan, or a request for clarification when the input was sufficient.",
  ];
  if (pkg.description)
    criteria.push(`The output serves the package's purpose: ${pkg.description.trim()}`);
  for (const m of pkg.must ?? []) criteria.push(`Contract rule satisfied: ${m}`);
  if (pkg.examples?.length) {
    criteria.push(
      `The output's shape and depth are consistent with the package's worked examples (e.g. example input: ${truncate(
        pkg.examples[0].input,
        160,
      )} → expected style: ${truncate(pkg.examples[0].output, 160)}).`,
    );
  }
  const hard_fail = (pkg.must_not ?? []).map((m) => `Violates contract rule: ${m}`);
  return { criteria, hard_fail: hard_fail.length ? hard_fail : undefined };
}

/**
 * Rubric for the hallucination axis: fabricated facts, tools, URLs or
 * citations relative to the supplied context. Used by the same judge to make
 * "hallucination rate" a measured number.
 */
export function hallucinationRubric(context?: string): JudgeRubric {
  return {
    criteria: [
      "Every concrete factual claim, citation, URL, tool name or API in the output is either present in the provided context, common knowledge, or explicitly marked as uncertain.",
    ],
    hard_fail: [
      "The output invents a citation, URL, tool, function, statistic or quotation that does not exist in the context and is not verifiable common knowledge." +
        (context
          ? ""
          : " (No context was provided — judge only self-contained fabrications such as fake URLs or invented citations.)"),
    ],
  };
}

export interface OutcomeGrade {
  task_completed: boolean;
  rationale: string;
  confidence?: number;
}

/**
 * Grade one real execution against the package contract. Judge errors return
 * null (unknown) — an outcome grader must never fabricate a pass/fail it
 * could not compute.
 */
export async function gradeOutcome(
  judge: JudgeFn,
  pkg: PackageContract,
  run: { input: string; output: string },
): Promise<OutcomeGrade | null> {
  let result: JudgeResult;
  try {
    result = await judge({
      caseId: `outcome:${pkg.slug}`,
      input: run.input,
      output: run.output,
      rubric: contractRubric(pkg),
    });
  } catch {
    return null;
  }
  return {
    task_completed: result.verdict === "pass",
    rationale: result.rationale,
    confidence: result.confidence,
  };
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
