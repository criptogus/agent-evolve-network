// Playbook runtime types. The runtime compiles a YAML Playbook into an
// executable state machine with: skill invocations, instructions, tool calls,
// conditional gating, retries, memory adapter, guardrail middleware, and
// telemetry emission compatible with src/lib/trust/telemetry.ts.

export type StepAction =
  | { kind: "instruction"; prompt: string }
  | { kind: "skill"; slug: string; with?: Record<string, unknown> }
  | { kind: "tool"; name: string; with?: Record<string, unknown> };

export interface CompiledStep {
  id: string;
  action: StepAction;
  when?: string;                    // expression: "${steps.foo.output contains 'x'}"
  on_error: "abort" | "continue" | "retry";
  retry?: { max: number; backoff_ms: number };
}

export interface CompiledPlaybook {
  slug: string;
  version: string;
  trigger?: string;
  inputs_schema?: Record<string, unknown>;
  outputs_schema?: Record<string, unknown>;
  steps: CompiledStep[];
  guardrails: string[];
  tags: string[];
  soul?: string;
}

export interface StepOutcome {
  step_id: string;
  status: "ok" | "skipped" | "error";
  output?: unknown;
  error?: string;
  attempts: number;
  duration_ms: number;
  guardrails_triggered: string[];
}

export interface RunResult {
  playbook_slug: string;
  version: string;
  status: "ok" | "partial" | "error";
  outputs: Record<string, unknown>;
  step_outcomes: StepOutcome[];
  duration_ms: number;
  trace_id: string;
}

export interface MemoryStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

export type SkillInvoker = (args: {
  slug: string;
  inputs: Record<string, unknown>;
  context: RunContext;
}) => Promise<unknown>;

export type ToolInvoker = (args: {
  name: string;
  inputs: Record<string, unknown>;
  context: RunContext;
}) => Promise<unknown>;

export type InstructionInvoker = (args: {
  prompt: string;
  context: RunContext;
}) => Promise<string>;

export type GuardrailFn = (args: {
  step_id: string;
  phase: "pre" | "post";
  payload: unknown;
  context: RunContext;
}) => Promise<{ pass: boolean; reason?: string; mutated?: unknown }>;

export interface Tracer {
  span<T>(name: string, attrs: Record<string, unknown>, fn: () => Promise<T>): Promise<T>;
  event(name: string, attrs: Record<string, unknown>): void;
}

export interface RunContext {
  trace_id: string;
  inputs: Record<string, unknown>;
  steps: Record<string, { output?: unknown; status: string }>;
  memory: MemoryStore;
  tracer: Tracer;
  metadata: Record<string, unknown>;
}

export interface RuntimeAdapters {
  invokeSkill: SkillInvoker;
  invokeTool?: ToolInvoker;
  invokeInstruction: InstructionInvoker;
  guardrails?: Record<string, GuardrailFn>;
  memory?: MemoryStore;
  tracer?: Tracer;
  onTelemetry?: (event: {
    package_slug: string;
    package_version: string;
    success: boolean;
    latency_ms: number;
    error_class?: string;
    guardrail_triggered: string[];
    runtime: "playbook";
  }) => void;
}
