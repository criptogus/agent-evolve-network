import type {
  CompiledPlaybook,
  RunContext,
  RunResult,
  RuntimeAdapters,
  StepOutcome,
  MemoryStore,
  Tracer,
  GuardrailFn,
} from "./types";
import { evaluateCondition, interpolate } from "./expr.ts";

const inMemoryMemory = (): MemoryStore => {
  const store = new Map<string, unknown>();
  return {
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) { store.set(k, v); },
  };
};

const noopTracer: Tracer = {
  async span(_n, _a, fn) { return fn(); },
  event() {},
};

function newTraceId() {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function runGuardrails(
  names: string[],
  registry: Record<string, GuardrailFn>,
  args: { step_id: string; phase: "pre" | "post"; payload: unknown; context: RunContext },
): Promise<{ pass: boolean; reason?: string; triggered: string[]; payload: unknown }> {
  const triggered: string[] = [];
  let payload = args.payload;
  for (const name of names) {
    const fn = registry[name];
    if (!fn) continue;
    const res = await fn({ ...args, payload });
    if (res.mutated !== undefined) payload = res.mutated;
    if (!res.pass) {
      triggered.push(name);
      return { pass: false, reason: `${name}: ${res.reason ?? "blocked"}`, triggered, payload };
    }
  }
  return { pass: true, triggered, payload };
}

export async function runPlaybook(
  playbook: CompiledPlaybook,
  inputs: Record<string, unknown>,
  adapters: RuntimeAdapters,
): Promise<RunResult> {
  const memory = adapters.memory ?? inMemoryMemory();
  const tracer = adapters.tracer ?? noopTracer;
  const guardrails = adapters.guardrails ?? {};
  const trace_id = newTraceId();
  const t0 = Date.now();

  const ctx: RunContext = {
    trace_id,
    inputs,
    steps: {},
    memory,
    tracer,
    metadata: { playbook: playbook.slug, version: playbook.version, soul: playbook.soul },
  };

  const outcomes: StepOutcome[] = [];
  let overall: "ok" | "partial" | "error" = "ok";
  const allGuardrailsTriggered = new Set<string>();

  for (const step of playbook.steps) {
    const stepT0 = Date.now();
    let attempts = 0;
    let status: StepOutcome["status"] = "ok";
    let output: unknown;
    let error: string | undefined;
    const triggered: string[] = [];

    // Conditional gating
    if (step.when && !evaluateCondition(step.when, ctx)) {
      ctx.steps[step.id] = { status: "skipped" };
      outcomes.push({
        step_id: step.id, status: "skipped", attempts: 0,
        duration_ms: 0, guardrails_triggered: [],
      });
      continue;
    }

    const interpolatedArgs = interpolate(
      step.action.kind === "instruction" ? step.action.prompt : step.action.with ?? {},
      ctx,
    );

    // Pre-guardrails
    const pre = await runGuardrails(playbook.guardrails, guardrails, {
      step_id: step.id, phase: "pre", payload: interpolatedArgs, context: ctx,
    });
    pre.triggered.forEach((g) => { triggered.push(g); allGuardrailsTriggered.add(g); });
    if (!pre.pass) {
      error = pre.reason; status = "error";
    } else {
      const payload = pre.payload;
      const maxAttempts = step.retry ? step.retry.max + 1 : 1;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          output = await tracer.span(
            `playbook.step.${step.id}`,
            { trace_id, step: step.id, action: step.action.kind, attempt: attempts },
            async () => {
              if (step.action.kind === "instruction") {
                return adapters.invokeInstruction({ prompt: payload as string, context: ctx });
              }
              if (step.action.kind === "skill") {
                return adapters.invokeSkill({
                  slug: step.action.slug,
                  inputs: (payload as Record<string, unknown>) ?? {},
                  context: ctx,
                });
              }
              if (!adapters.invokeTool) throw new Error("no tool invoker configured");
              return adapters.invokeTool({
                name: step.action.name,
                inputs: (payload as Record<string, unknown>) ?? {},
                context: ctx,
              });
            },
          );
          break;
        } catch (err) {
          error = (err as Error).message;
          if (attempts >= maxAttempts) {
            status = "error";
          } else if (step.retry) {
            await new Promise((r) => setTimeout(r, step.retry!.backoff_ms * attempts));
          }
        }
      }
    }

    // Post-guardrails
    if (status !== "error" && output !== undefined) {
      const post = await runGuardrails(playbook.guardrails, guardrails, {
        step_id: step.id, phase: "post", payload: output, context: ctx,
      });
      post.triggered.forEach((g) => { triggered.push(g); allGuardrailsTriggered.add(g); });
      if (!post.pass) { status = "error"; error = post.reason; }
      else { output = post.payload; }
    }

    ctx.steps[step.id] = { output, status };

    if (status === "error") {
      if (step.on_error === "continue") {
        overall = overall === "error" ? "error" : "partial";
      } else {
        outcomes.push({
          step_id: step.id, status, error, attempts,
          duration_ms: Date.now() - stepT0, output, guardrails_triggered: triggered,
        });
        overall = "error";
        break;
      }
    }

    outcomes.push({
      step_id: step.id, status, error, attempts,
      duration_ms: Date.now() - stepT0, output, guardrails_triggered: triggered,
    });
  }

  const duration_ms = Date.now() - t0;
  const outputs: Record<string, unknown> = {};
  for (const o of outcomes) outputs[o.step_id] = o.output;

  adapters.onTelemetry?.({
    package_slug: playbook.slug,
    package_version: playbook.version,
    success: overall === "ok",
    latency_ms: duration_ms,
    error_class: overall === "error" ? "step_failure" : undefined,
    guardrail_triggered: [...allGuardrailsTriggered],
    runtime: "playbook",
  });

  return {
    playbook_slug: playbook.slug,
    version: playbook.version,
    status: overall,
    outputs,
    step_outcomes: outcomes,
    duration_ms,
    trace_id,
  };
}
