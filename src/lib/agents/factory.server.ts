import { generateText } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";

/**
 * Agent Factory — generation pipeline.
 *
 * Mirrors src/lib/packs/pipeline.server.ts: one bounded model call per step so
 * a single HTTP request never approaches the Worker timeout. The caller
 * (factory.functions.ts) advances the state machine one step at a time and
 * persists after every step, so a slow model can never lose work.
 */

const FAST_MODEL = "google/gemini-2.5-flash";
const DEEP_MODEL = "google/gemini-2.5-pro";

export type AgentBrief = {
  role: string;
  company: string;
  industry?: string;
  outcomes?: string;
  tone?: string;
  constraints?: string;
  context?: string;
  language?: string;
};

export type AgentResearch = {
  summary: string;
  principles: string[];
  sources: { title: string; ref: string }[];
};

export type GeneratedDoc = { slug: string; title: string; summary: string; body: string };
export type GeneratedGuardrail = {
  slug: string;
  title: string;
  rule: string;
  why: string;
  /** A realistic request that this guardrail blocks. */
  blocked_example?: string;
  /** What the agent does instead when it hits this rule. */
  instead?: string;
};

export type AgentIdentity = { name: string; role: string; emoji: string; tagline: string };

function parseJsonLoose(text: string): any {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model did not return valid JSON");
  }
}

function briefBlock(b: AgentBrief): string {
  return [
    `ROLE / TITLE: ${b.role}`,
    `COMPANY CONTEXT: ${b.company}`,
    `INDUSTRY: ${b.industry || "(not specified)"}`,
    `PRIMARY OUTCOMES: ${b.outcomes || "(not specified)"}`,
    `TONE / VOICE: ${b.tone || "(not specified)"}`,
    `HARD CONSTRAINTS (the agent must never violate these): ${b.constraints || "(none stated)"}`,
    `EXTRA CONTEXT / PASTED DOCS: ${(b.context || "(none)").slice(0, 6000)}`,
    `OUTPUT LANGUAGE: ${b.language || "match the language of the brief"}`,
  ].join("\n");
}

const SOTA_SYS = `You are a senior practitioner researcher. Produce a tight "state of the art" brief for a corporate role so that downstream prompts produce world-class output. Anchor on widely-cited frameworks and named methods (e.g. MEDDPICC for enterprise sales, April Dunford for positioning, Jobs-to-be-Done, RICE, SCQA for exec comms, OKRs, DORA metrics for engineering, unit economics for finance, STAR for hiring). Be specific; never generic platitudes.`;

export async function researchRole(brief: AgentBrief): Promise<AgentResearch> {
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    system: SOTA_SYS,
    temperature: 0.3,
    prompt: `${briefBlock(brief)}

Return STRICT JSON:
{
  "summary": "<= 6 lines. What 'state of the art' means for THIS role in THIS company context.",
  "principles": ["<= 8 crisp single-line principles every output of this agent must follow"],
  "sources": [{"title":"Framework or thinker","ref":"book/article/standard name"}]
}
No markdown, no prose outside JSON.`,
  });
  const r = parseJsonLoose(text) as AgentResearch;
  return {
    summary: r.summary || "",
    principles: Array.isArray(r.principles) ? r.principles.slice(0, 10) : [],
    sources: Array.isArray(r.sources) ? r.sources.slice(0, 10) : [],
  };
}

export async function generateIdentityAndSoul(
  brief: AgentBrief,
  research: AgentResearch,
): Promise<{ identity: AgentIdentity; soul: string }> {
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    temperature: 0.4,
    system: `You write "souls" for corporate AI agents: the operating identity a model loads as its system prompt. A soul is NOT a persona blurb — it is an operating system for judgement. It must contain, in this order, with these exact H2 headings:

## Identity
## Operating principles
## Reasoning process
## Definition of done
## Hard rules
## Escalation & uncertainty
## Output contract

Requirements: second person ("You are..."), concrete and testable statements, no filler, no "as an AI language model", no marketing tone. Hard rules must be enforceable and include the user's stated constraints verbatim in meaning. Minimum 600 words.`,
    prompt: `${briefBlock(brief)}

STATE OF THE ART (must be honored):
${research.principles.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Return STRICT JSON:
{
  "name": "<short agent name, e.g. 'Chief Revenue Agent'>",
  "role": "<one-line role title>",
  "emoji": "<single emoji>",
  "tagline": "<= 90 chars",
  "soul": "<the full markdown soul>"
}`,
  });
  const p = parseJsonLoose(text);
  return {
    identity: {
      name: String(p.name || brief.role).slice(0, 80),
      role: String(p.role || brief.role).slice(0, 120),
      emoji: String(p.emoji || "🤖").slice(0, 8),
      tagline: String(p.tagline || "").slice(0, 140),
    },
    soul: String(p.soul || ""),
  };
}

const DOC_RULES = `Every document must contain these H2 sections: "## When to use", "## Inputs", "## Procedure", "## Quality bar", "## Failure modes", "## Output format". The procedure must be numbered, concrete and executable by a model with no further clarification. Include at least one worked mini-example. No filler, no restating the section titles as content. Minimum 400 words per document.`;

export async function generateDocs(
  kind: "skill" | "playbook",
  brief: AgentBrief,
  research: AgentResearch,
  soul: string,
  count: number,
): Promise<GeneratedDoc[]> {
  const what =
    kind === "skill"
      ? "bounded capabilities the agent applies when a situation matches (single job, repeatable)"
      : "multi-step procedures the agent follows end to end when invoked (a named workflow with a start and a finish)";
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    temperature: 0.4,
    system: `You author production ${kind}s for corporate AI agents. ${kind === "skill" ? "Skills are" : "Playbooks are"} ${what}. ${DOC_RULES}`,
    prompt: `${briefBlock(brief)}

STATE OF THE ART:
${research.principles.map((p, i) => `${i + 1}. ${p}`).join("\n")}

THE AGENT'S SOUL (already written — do not repeat it, extend it):
"""
${soul.slice(0, 6000)}
"""

Produce exactly ${count} ${kind}s that cover the highest-leverage work of this role. No overlap between them.

Return STRICT JSON array:
[{"slug":"kebab-case","title":"Title Case","summary":"one line, <= 140 chars","body":"full markdown body"}]`,
  });
  const arr = parseJsonLoose(text);
  const list: GeneratedDoc[] = (Array.isArray(arr) ? arr : arr?.[kind + "s"] || []).map((d: any, i: number) => ({
    slug: String(d.slug || `${kind}-${i + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60),
    title: String(d.title || `${kind} ${i + 1}`).slice(0, 120),
    summary: String(d.summary || "").slice(0, 200),
    body: String(d.body || ""),
  }));
  return list.filter((d) => d.body.length > 200).slice(0, count);
}

export async function generateGuardrails(
  brief: AgentBrief,
  research: AgentResearch,
): Promise<GeneratedGuardrail[]> {
  const { text } = await generateText({
    model: getGatewayModel(FAST_MODEL),
    temperature: 0.2,
    system: `You write guardrails for corporate AI agents: hard, checkable constraints that stop the agent from causing legal, financial, privacy, brand or safety damage. Each rule must be a single enforceable sentence in the imperative ("Never ...", "Always ..."), verifiable by reading the output.`,
    prompt: `${briefBlock(brief)}

STATE OF THE ART:
${research.principles.join("\n")}

Produce 6 to 9 guardrails. Cover, at minimum: (1) the user's stated hard constraints, (2) confidential/PII data handling, (3) regulated or legal claims relevant to this industry, (4) financial or contractual commitments the agent must not make alone, (5) fabrication — no invented numbers, sources or customer facts, (6) escalation to a human.

Return STRICT JSON array:
[{"slug":"kebab-case","title":"Short name","rule":"the enforceable sentence","why":"one line on the risk it prevents"}]`,
  });
  const arr = parseJsonLoose(text);
  return (Array.isArray(arr) ? arr : []).slice(0, 10).map((g: any, i: number) => ({
    slug: String(g.slug || `guardrail-${i + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60),
    title: String(g.title || `Guardrail ${i + 1}`).slice(0, 120),
    rule: String(g.rule || "").slice(0, 600),
    why: String(g.why || "").slice(0, 400),
  }));
}

export type AgentScore = {
  score: number;
  axes: { name: string; score: number; note: string }[];
  weaknesses: string[];
  verdict: string;
};

export async function scoreAgent(input: {
  brief: AgentBrief;
  soul: string;
  skills: GeneratedDoc[];
  playbooks: GeneratedDoc[];
  guardrails: GeneratedGuardrail[];
}): Promise<AgentScore> {
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    temperature: 0.1,
    system: `You are a strict evaluator of agent packages. Score on 6 axes, 0-100 each: Identity clarity, Reasoning rigor, Domain substance (real expertise vs generic advice), Actionability (can a model execute it without asking questions), Guardrail coverage, Output contract. Penalize generic filler, unsupported claims and missing sections. Judge substance in the language the content is written in — never penalize non-English content.`,
    prompt: `BRIEF:
${briefBlock(input.brief)}

SOUL:
"""
${input.soul.slice(0, 9000)}
"""

SKILLS: ${input.skills.map((s) => `${s.title} :: ${s.summary}`).join(" | ")}
PLAYBOOKS: ${input.playbooks.map((p) => `${p.title} :: ${p.summary}`).join(" | ")}
GUARDRAILS: ${input.guardrails.map((g) => g.rule).join(" | ")}

Return STRICT JSON:
{
  "axes": [{"name":"Identity clarity","score":0,"note":"one line, cite evidence from the content"}],
  "weaknesses": ["concrete, fixable gaps — each names the artifact it applies to"],
  "verdict": "<= 3 lines"
}`,
  });
  const p = parseJsonLoose(text);
  const axes = (Array.isArray(p.axes) ? p.axes : []).map((a: any) => ({
    name: String(a.name || "axis").slice(0, 60),
    score: Math.max(0, Math.min(100, Number(a.score) || 0)),
    note: String(a.note || "").slice(0, 400),
  }));
  const score = axes.length ? Math.round(axes.reduce((s: number, a: any) => s + a.score, 0) / axes.length) : 0;
  return {
    score,
    axes,
    weaknesses: (Array.isArray(p.weaknesses) ? p.weaknesses : []).slice(0, 8).map((w: any) => String(w)),
    verdict: String(p.verdict || "").slice(0, 600),
  };
}

/** One repair round: rewrite the soul against the evaluator's weaknesses. */
export async function repairSoul(input: {
  brief: AgentBrief;
  soul: string;
  weaknesses: string[];
}): Promise<string> {
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    temperature: 0.3,
    system: `You revise agent souls. Keep every existing H2 section and everything that already works; fix only the named weaknesses, and make the result longer and more specific, never shorter. Output ONLY the revised markdown soul — no commentary, no code fences.`,
    prompt: `${briefBlock(input.brief)}

WEAKNESSES TO FIX:
${input.weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")}

CURRENT SOUL:
"""
${input.soul}
"""`,
  });
  const out = text.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return out.length > input.soul.length * 0.6 ? out : input.soul;
}
