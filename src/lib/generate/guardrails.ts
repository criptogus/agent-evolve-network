import type { Artifact, Governance } from "@/lib/generate/types";

/* ---------- guardrail explanations ---------- */

export const GUARDRAIL_BLURBS: Array<{ match: RegExp; blurb: string }> = [
  {
    match: /pii|redact|privacy/i,
    blurb:
      "Detects names, emails, phone numbers, IDs and PHI; redacts before logging or sending to third parties.",
  },
  {
    match: /medical|clinical|hippocratic|fda/i,
    blurb:
      "Blocks unsafe drug doses, requires citation of authoritative source, escalates to a clinician above an uncertainty threshold.",
  },
  {
    match: /no-?halluc|grounding|citation/i,
    blurb:
      "Rejects claims with no retrievable source. Every factual statement must carry a citation.",
  },
  {
    match: /competit|brand|legal/i,
    blurb:
      "Refuses to recommend competitors, mention disallowed brands, or speculate on litigation.",
  },
  {
    match: /jailbreak|injection|prompt/i,
    blurb:
      "Filters prompt-injection attempts in tool inputs and untrusted documents before the model sees them.",
  },
];

export function explainGuardrail(name: string) {
  return (
    GUARDRAIL_BLURBS.find((g) => g.match.test(name))?.blurb ??
    "Hard boundary: outputs that violate the rule are blocked or require human approval before sending."
  );
}

export interface ImplicitGuardrail {
  id: string;
  name: string;
  why: string;
}

export function implicitGuardrails(level: Governance, current: Artifact[]): ImplicitGuardrail[] {
  const have = new Set(
    current.filter((a) => a.kind === "guardrail").map((a) => a.name.toLowerCase()),
  );
  const pool: ImplicitGuardrail[] = [];

  pool.push({
    id: "pii-baseline",
    name: "pii-redactor",
    why: "Auto-redacts personal data before it leaves the agent — applied to every output and tool call.",
  });
  if (level === "strict" || level === "lockdown") {
    pool.push({
      id: "grounding",
      name: "no-hallucination",
      why: "Every factual claim is checked by a second model and dropped if no source can be cited.",
    });
    pool.push({
      id: "injection",
      name: "prompt-injection-shield",
      why: "Strips instructions hidden inside retrieved documents and untrusted tool outputs.",
    });
  }
  if (level === "lockdown") {
    pool.push({
      id: "hitl",
      name: "human-in-the-loop-writes",
      why: "Any tool call that mutates external state (send, charge, deploy) requires explicit human approval.",
    });
    pool.push({
      id: "audit",
      name: "full-audit-trail",
      why: "Every prompt, tool call and output is signed and stored for regulator-grade replay.",
    });
  }

  return pool.filter((g) => !have.has(g.name.toLowerCase()));
}
