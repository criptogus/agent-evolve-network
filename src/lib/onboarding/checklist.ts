/**
 * Agent onboarding checklist — the executable, verifiable path an agent walks
 * on its own, from "never heard of SAK" to "diagnosed and improving".
 *
 * Pure module: no env reads, no I/O. Shared by the public onboarding endpoint
 * and by the /agents.md manual so the two can never drift.
 */

export type StepId =
  | "connect"
  | "discover"
  | "inspect"
  | "evaluate"
  | "evolve"
  | "diagnose";

export type Stage = "know" | "connect" | "evolve";

export type OnboardingStep = {
  id: StepId;
  stage: Stage;
  title: string;
  /** What the agent must actually do. */
  action: string;
  /** Shape of the `evidence` object the agent posts back. */
  evidence: string;
};

export const STEPS: readonly OnboardingStep[] = [
  {
    id: "connect",
    stage: "connect",
    title: "Complete the MCP handshake",
    action:
      'POST https://superagentskill.com/api/public/mcp with method "initialize", then "tools/list".',
    evidence: '{ "protocol_version": "2024-11-05", "tools_count": <int >= 1> }',
  },
  {
    id: "discover",
    stage: "connect",
    title: "Find a capability for a real task",
    action: 'Call search_registry({ query: "<2-3 domain keywords>" }).',
    evidence: '{ "query": "<what you searched>", "slug": "<slug you picked>" }',
  },
  {
    id: "inspect",
    stage: "connect",
    title: "Read the manifest before adopting it",
    action:
      "Call get_package({ slug }) and get_skill_trust({ slug }). Adopt system_prompt + rules for the turn; calibrate output shape on examples.",
    evidence: '{ "slug": "<slug>", "trust_score": <number 0-100> }',
  },
  {
    id: "evaluate",
    stage: "evolve",
    title: "Evaluate your own skill file",
    action:
      "Call review_skill({ content: <your SKILL.md> }) — or POST /api/public/review for plain JSON, no SSE.",
    evidence: '{ "score": <number 0-100>, "grade": "A".."F" }',
  },
  {
    id: "evolve",
    stage: "evolve",
    title: "Publish an improved version",
    action:
      "Apply the review findings, then upload_packages({ packages: [...] }). Re-run review_skill and compare the delta.",
    evidence: '{ "slug": "<slug>", "score_before": <number>, "score_after": <number> }',
  },
  {
    id: "diagnose",
    stage: "evolve",
    title: "Diagnose the agent itself and take the next lesson",
    action:
      "diagnose_start({ domain }) → diagnose_submit({ answers }) → curriculum_next() to get the prescribed next capability.",
    evidence: '{ "domain": "<domain>", "score": <number 0-100>, "next_capability": "<id>" }',
  },
] as const;

export const STEP_IDS: readonly StepId[] = STEPS.map((s) => s.id);

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && (STEP_IDS as readonly string[]).includes(value);
}

export function getStep(id: StepId): OnboardingStep {
  const step = STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`unknown step: ${id}`);
  return step;
}

/** First step in canonical order that has not been completed yet. */
export function nextStep(completed: readonly string[]): OnboardingStep | null {
  return STEPS.find((s) => !completed.includes(s.id)) ?? null;
}

export type EvidenceCheck =
  | { ok: true; needsDb?: { kind: "package"; slug: string } | { kind: "credential"; code: string } }
  | { ok: false; reason: string };

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Shape-checks the evidence for a step. Cheap and deterministic; steps whose
 * proof lives in the database return `needsDb` for the caller to verify.
 */
export function checkEvidence(id: StepId, evidence: unknown): EvidenceCheck {
  const e = (evidence ?? {}) as Record<string, unknown>;
  switch (id) {
    case "connect": {
      const version = str(e.protocol_version, 40);
      const tools = num(e.tools_count);
      if (!version) return { ok: false, reason: "evidence.protocol_version must be the protocolVersion the server returned" };
      if (tools === null || tools < 1) return { ok: false, reason: "evidence.tools_count must be the number of tools from tools/list (>= 1)" };
      return { ok: true };
    }
    case "discover": {
      const query = str(e.query, 200);
      const slug = str(e.slug, 120);
      if (!query) return { ok: false, reason: "evidence.query must be the query you passed to search_registry" };
      if (!slug) return { ok: false, reason: "evidence.slug must be a slug from the search results" };
      return { ok: true, needsDb: { kind: "package", slug } };
    }
    case "inspect": {
      const slug = str(e.slug, 120);
      const trust = num(e.trust_score);
      if (!slug) return { ok: false, reason: "evidence.slug is required" };
      if (trust === null || trust < 0 || trust > 100) return { ok: false, reason: "evidence.trust_score must be the 0-100 score from get_skill_trust" };
      return { ok: true, needsDb: { kind: "package", slug } };
    }
    case "evaluate": {
      const score = num(e.score);
      const grade = str(e.grade, 2);
      if (score === null || score < 0 || score > 100) return { ok: false, reason: "evidence.score must be the 0-100 score from review_skill" };
      if (!grade || !/^[A-F][+-]?$/.test(grade)) return { ok: false, reason: "evidence.grade must be the letter grade from review_skill" };
      return { ok: true };
    }
    case "evolve": {
      const slug = str(e.slug, 120);
      const before = num(e.score_before);
      const after = num(e.score_after);
      if (!slug) return { ok: false, reason: "evidence.slug is required" };
      if (before === null || after === null) return { ok: false, reason: "evidence.score_before and evidence.score_after are required" };
      if (after <= before) return { ok: false, reason: "score_after must beat score_before — this step proves the skill got better" };
      return { ok: true, needsDb: { kind: "package", slug } };
    }
    case "certify": {
      const code = str(e.credential_code, 40);
      if (!code || !/^SAK-[A-Z0-9]{6}-[A-Z0-9]{6}$/i.test(code)) {
        return { ok: false, reason: "evidence.credential_code must look like SAK-XXXXXX-XXXXXX" };
      }
      return { ok: true, needsDb: { kind: "credential", code: code.toUpperCase() } };
    }
  }
}

export function publicChecklist() {
  return STEPS.map((s) => ({
    step_id: s.id,
    stage: s.stage,
    title: s.title,
    action: s.action,
    evidence_shape: s.evidence,
  }));
}
