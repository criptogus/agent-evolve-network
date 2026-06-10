export type Kind = "skill" | "playbook" | "soul" | "guardrail";

export interface Artifact {
  kind: Kind;
  name: string;
  version: string;
  summary: string;
  source: "enriched" | "generated";
  delta: { health: number; precision: number; safety: number; latency: number };
  bullets: string[];
}

export interface StreamLine {
  id: number;
  text: string;
  tone: "muted" | "info" | "ok" | "warn" | "evolve";
}

export interface Preset {
  id: string;
  name: string;
  tags: string[];
  prompt: string;
  createdAt: number;
  lastRun?: {
    at: number;
    artifacts: number;
    healthDelta: number;
    precisionDelta: number;
    latencyDelta: number;
  };
}

export type Governance = "standard" | "strict" | "lockdown";

export const GOVERNANCE: Record<Governance, { label: string; blurb: string; safetyBoost: number }> =
  {
    standard: {
      label: "Standard",
      blurb:
        "Balanced defaults: PII redaction, citation enforcement, refusal on out-of-scope asks.",
      safetyBoost: 0,
    },
    strict: {
      label: "Strict",
      blurb:
        "Adds dual-LLM judge on every output, blocks ungrounded claims, requires source for any number.",
      safetyBoost: 4,
    },
    lockdown: {
      label: "Lockdown",
      blurb:
        "Regulated-industry mode: human-in-the-loop on writes, full audit log, jailbreak & prompt-injection shields.",
      safetyBoost: 8,
    },
  };

export const KIND_LABELS: Record<Kind, string> = {
  skill: "Skills",
  playbook: "Playbooks",
  soul: "Souls",
  guardrail: "Guardrails",
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
export function round(n: number) {
  return Math.round(n * 10) / 10;
}
export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
export function labelOf(k: Kind) {
  return k;
}
export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
