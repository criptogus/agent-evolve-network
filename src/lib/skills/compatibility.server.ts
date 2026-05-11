/**
 * Compatibility Matrix probe — lightweight cross-model evaluation.
 *
 * For each (skill version, model) pair: run every example, then ask a judge
 * model to score pass/fail per example. Produces a pass_rate and judge_score
 * suitable for a public compatibility badge.
 *
 * This is intentionally lighter than evaluatorPipeline (no adversarial /
 * ensemble) so we can sweep many models cheaply on a schedule.
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import { getGatewayModel } from "@/lib/ai-gateway";

export const COMPAT_MODELS = [
  "anthropic/claude-sonnet-4-5",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
] as const;
export type CompatModel = (typeof COMPAT_MODELS)[number] | string;

const JUDGE_MODEL = "openai/gpt-5.2";

type Example = { title: string; input: string; expected_output: string };

const JudgeSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      pass: z.boolean(),
      score: z.number().min(0).max(100),
      reason: z.string().max(280),
    }),
  ),
  summary: z.string().max(400),
});

export type CompatibilityResult = {
  model: string;
  total: number;
  passed: number;
  pass_rate: number;
  judge_score: number;
  status: "pass" | "warn" | "fail";
  notes: string;
  sample: Array<{ title: string; pass: boolean; score: number; reason: string }>;
};

export async function probeCompatibility(opts: {
  systemPrompt: string;
  examples: Example[];
  model: string;
  maxCases?: number;
}): Promise<CompatibilityResult> {
  const cases = opts.examples.slice(0, opts.maxCases ?? 5);
  if (cases.length === 0) {
    return {
      model: opts.model,
      total: 0,
      passed: 0,
      pass_rate: 0,
      judge_score: 0,
      status: "fail",
      notes: "no examples to probe",
      sample: [],
    };
  }

  let actuals: Array<Example & { actual_output: string; errored: boolean }>;
  try {
    actuals = await Promise.all(
      cases.map(async (c) => {
        try {
          const { text } = await generateText({
            model: getGatewayModel(opts.model),
            system: opts.systemPrompt,
            prompt: c.input,
          });
          return { ...c, actual_output: text, errored: false };
        } catch (e) {
          return { ...c, actual_output: `ERROR: ${(e as Error).message}`, errored: true };
        }
      }),
    );
  } catch (e) {
    return {
      model: opts.model,
      total: cases.length,
      passed: 0,
      pass_rate: 0,
      judge_score: 0,
      status: "fail",
      notes: `model unavailable: ${(e as Error).message}`,
      sample: [],
    };
  }

  // Judge once with all cases in a single call
  let judged: z.infer<typeof JudgeSchema>;
  try {
    const out = await generateText({
      model: getGatewayModel(JUDGE_MODEL),
      system:
        "You are SkillForge's compatibility judge. For each case, decide if the actual_output satisfies the expected_output's intent and constraints. pass=true only if it is materially correct. score is 0-100 (calibrated). Be strict but fair across model styles.",
      prompt: JSON.stringify(
        actuals.map((a) => ({
          title: a.title,
          input: a.input,
          expected_output: a.expected_output,
          actual_output: a.actual_output,
        })),
      ),
      experimental_output: Output.object({ schema: JudgeSchema }),
    });
    judged = (out as { experimental_output: z.infer<typeof JudgeSchema> }).experimental_output;
  } catch (e) {
    return {
      model: opts.model,
      total: cases.length,
      passed: 0,
      pass_rate: 0,
      judge_score: 0,
      status: "fail",
      notes: `judge failed: ${(e as Error).message}`,
      sample: [],
    };
  }

  const total = judged.results.length;
  const passed = judged.results.filter((r) => r.pass).length;
  const pass_rate = total ? passed / total : 0;
  const judge_score = total
    ? Math.round(judged.results.reduce((s, r) => s + r.score, 0) / total)
    : 0;
  const status: "pass" | "warn" | "fail" =
    pass_rate >= 0.85 ? "pass" : pass_rate >= 0.6 ? "warn" : "fail";

  return {
    model: opts.model,
    total,
    passed,
    pass_rate,
    judge_score,
    status,
    notes: judged.summary,
    sample: judged.results.slice(0, 5),
  };
}
