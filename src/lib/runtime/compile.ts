import type { CompiledPlaybook, CompiledStep, StepAction } from "./types";

interface YamlPlaybook {
  slug: string;
  version: string;
  type: "playbook";
  trigger?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  steps: Array<{
    id: string;
    action: string;
    with?: Record<string, unknown>;
    when?: string;
    on_error?: "abort" | "continue" | "retry";
    retry?: { max?: number; backoff_ms?: number };
  }>;
  guardrails?: string[];
  tags?: string[];
  soul?: string;
}

export function compilePlaybook(yaml: YamlPlaybook): CompiledPlaybook {
  if (!yaml || yaml.type !== "playbook") {
    throw new Error("compilePlaybook: input is not a playbook");
  }
  const ids = new Set<string>();
  const steps: CompiledStep[] = yaml.steps.map((s) => {
    if (!s.id) throw new Error("step missing id");
    if (ids.has(s.id)) throw new Error(`duplicate step id: ${s.id}`);
    ids.add(s.id);
    return {
      id: s.id,
      action: parseAction(s.action, s.with),
      when: s.when,
      on_error: s.on_error ?? "abort",
      retry: s.on_error === "retry"
        ? { max: s.retry?.max ?? 2, backoff_ms: s.retry?.backoff_ms ?? 500 }
        : undefined,
    };
  });
  return {
    slug: yaml.slug,
    version: yaml.version,
    trigger: yaml.trigger,
    inputs_schema: yaml.inputs,
    outputs_schema: yaml.outputs,
    steps,
    guardrails: yaml.guardrails ?? [],
    tags: yaml.tags ?? [],
    soul: yaml.soul,
  };
}

function parseAction(action: string, withArgs?: Record<string, unknown>): StepAction {
  if (action.startsWith("skill:")) {
    return { kind: "skill", slug: action.slice(6), with: withArgs };
  }
  if (action.startsWith("tool:")) {
    return { kind: "tool", name: action.slice(5), with: withArgs };
  }
  if (action === "instruction") {
    const prompt = (withArgs?.prompt as string | undefined) ?? "";
    if (!prompt) throw new Error("instruction step missing 'with.prompt'");
    return { kind: "instruction", prompt };
  }
  throw new Error(`unknown action: ${action}`);
}
