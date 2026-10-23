import { generateText } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";

export type PackItemSource = {
  package_id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  role: string;
  system_prompt: string;
  rules: unknown;
  examples: unknown;
};

export type CustomizedItem = {
  package_id: string;
  slug: string;
  name: string;
  type: string;
  role: string;
  customized_system_prompt: string;
  customization_notes: string;
  preserved_rules: string[];
  added_rules: string[];
};

export type ResearchResult = {
  summary: string;
  principles: string[];
  sources: { title: string; ref: string }[];
};

const FAST_MODEL = "google/gemini-2.5-flash";
const DEEP_MODEL = "google/gemini-2.5-pro";

export async function researchStateOfTheArt(input: {
  packName: string;
  packTheme: string;
  brief: string;
  niche?: string;
  audience?: string;
}): Promise<ResearchResult> {
  const sys = `You are a senior practitioner researcher. Produce a tight "state of the art" brief for the topic so that downstream prompts produce world-class output. Anchor on widely-cited frameworks, named methods (e.g. April Dunford for positioning, MEDDPICC for sales discovery, Jobs-to-be-Done, RICE, ICP scoring, E-E-A-T for SEO, AIDA, Hook–Promise–Payoff for short-form, SCQA for execs). Be specific; avoid generic platitudes.`;
  const user = `PACK: ${input.packName} (theme: ${input.packTheme})
USER NICHE: ${input.niche || "(not specified)"}
USER AUDIENCE: ${input.audience || "(not specified)"}
USER BRIEF: ${input.brief}

Return STRICT JSON with this shape:
{
  "summary": "<= 6 lines. What "state of the art" means for THIS pack applied to the user's niche.",
  "principles": ["<= 8 crisp principles, each a single line, that any output produced from this pack must follow"],
  "sources": [{"title":"Framework or thinker","ref":"book/article/standard name"}]
}
No markdown. No prose outside JSON.`;
  const { text } = await generateText({
    model: getGatewayModel(DEEP_MODEL),
    system: sys,
    prompt: user,
    temperature: 0.3,
  });
  return parseJsonLoose(text) as ResearchResult;
}

export async function customizeItem(input: {
  research: ResearchResult;
  item: PackItemSource;
  brief: string;
  niche?: string;
  audience?: string;
  voice?: string;
}): Promise<CustomizedItem> {
  const { item, research } = input;
  const sys = `You are a master prompt-engineer. You ADAPT an existing best-in-class skill/playbook prompt to a buyer's niche WITHOUT regressing below the state of the art. You must:
- Preserve every operating rule that protects quality, safety or rigor.
- Layer the user's niche, audience and voice on top.
- Inject the state-of-the-art principles (do NOT replace them).
- Keep the original structure and section headers; extend, don't truncate.
- Output only the new prompt. No explanations.`;

  const user = `STATE OF THE ART (must be honored):
${research.principles.map((p, i) => `${i + 1}. ${p}`).join("\n")}

USER BRIEF:
- niche: ${input.niche || "n/a"}
- audience: ${input.audience || "n/a"}
- voice: ${input.voice || "n/a"}
- extra: ${input.brief}

ORIGINAL SYSTEM PROMPT (${item.type} — ${item.name}):
"""
${item.system_prompt}
"""

ORIGINAL RULES (JSON, keep all that apply):
${JSON.stringify(item.rules, null, 2)}

Return STRICT JSON:
{
  "customized_system_prompt": "<full adapted prompt, ready to paste into an agent>",
  "customization_notes": "<= 4 lines on what you adapted and why",
  "preserved_rules": ["<list of original rule keys/phrases you kept>"],
  "added_rules": ["<list of new rules layered for this niche/audience>"]
}`;
  const { text } = await generateText({
    model: getGatewayModel(FAST_MODEL),
    system: sys,
    prompt: user,
    temperature: 0.4,
  });
  const parsed = parseJsonLoose(text) as Omit<CustomizedItem, "package_id" | "slug" | "name" | "type" | "role">;
  return {
    package_id: item.package_id,
    slug: item.slug,
    name: item.name,
    type: item.type,
    role: item.role,
    customized_system_prompt: parsed.customized_system_prompt || item.system_prompt,
    customization_notes: parsed.customization_notes || "",
    preserved_rules: parsed.preserved_rules || [],
    added_rules: parsed.added_rules || [],
  };
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}$/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model did not return valid JSON");
  }
}
