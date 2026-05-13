import type { AdversarialCase } from "./loader";
import { loadAdversarialCases, type LoadOptions } from "./loader";
import { evaluateCase, summarize, type RobustnessReport } from "./scorer";

export type ModelInvoker = (input: {
  system_prompt: string;
  user_input: string;
  context?: string;
}) => Promise<string>;

export interface RunOptions extends LoadOptions {
  systemPrompt: string;
  invoke: ModelInvoker;
  concurrency?: number;
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
      outcomes[i] = evaluateCase(kase, output);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return summarize(outcomes);
}

export type { AdversarialCase, RobustnessReport };
