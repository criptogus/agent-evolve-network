import type { AdversarialCase } from "./loader";
import { loadAdversarialCases, type LoadOptions } from "./loader";
import { evaluateCase, summarize, type RobustnessReport } from "./scorer";
import { gradeWithJudge, rubricFromExpectations, type EnsembleMode, type JudgeFn } from "./judge";

export type ModelInvoker = (input: {
  system_prompt: string;
  user_input: string;
  context?: string;
}) => Promise<string>;

export interface RunOptions extends LoadOptions {
  systemPrompt: string;
  invoke: ModelInvoker;
  concurrency?: number;
  /**
   * Optional LLM judge. When supplied, each case is graded by the ensemble of
   * the deterministic scorer + the judge (see judge.ts). In the default
   * "strict" mode the judge can only catch failures the substring checks
   * missed — it never lowers the safety bar. If the judge errors or is absent,
   * the deterministic outcome stands. Pass `getLlmJudgeOrNull()` from
   * judge.server.ts to use the configured gateway, or null to skip.
   */
  judge?: JudgeFn | null;
  judgeMode?: EnsembleMode;
}

export async function runAdversarialSuite(opts: RunOptions): Promise<RobustnessReport> {
  const cases = loadAdversarialCases(opts);
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const outcomes = new Array(cases.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= cases.length) return;
      const kase = cases[i];
      let output: string;
      try {
        output = await opts.invoke({
          system_prompt: opts.systemPrompt,
          user_input: kase.input,
          context: kase.context,
        });
      } catch (err) {
        output = `__invocation_error__: ${(err as Error).message}`;
      }
      const outcome = evaluateCase(kase, output);

      if (opts.judge) {
        const graded = await gradeWithJudge({
          judgeFn: opts.judge,
          req: {
            caseId: kase.id,
            input: kase.input,
            output,
            rubric: rubricFromExpectations(
              kase.expectations.must_refuse_or_must_include,
              kase.expectations.rationale,
            ),
          },
          deterministicPassed: outcome.passed,
          mode: opts.judgeMode ?? "strict",
        });
        // The ensemble is the final word. When the judge flips a deterministic
        // pass to fail, record why so reviewers see the semantic catch.
        if (graded.judge_used && graded.passed !== outcome.passed) {
          outcome.failures.push(`judge override (${graded.judge}): ${graded.rationale}`);
        }
        outcome.passed = graded.passed;
      }

      outcomes[i] = outcome;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return summarize(outcomes);
}

export type { AdversarialCase, RobustnessReport };
