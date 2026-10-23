/**
 * CRM tool + usage-pattern profile.
 *
 * Pure module: maps the raw MCP client names we observe (OAuth `client_name`,
 * personal-token labels, user agents) onto the provider registry, then derives
 * a usage pattern. Copy uses this to say "your Cursor rules" instead of "your
 * tools", which is the difference between a generic upsell and a relevant one.
 */
import { PROVIDERS, getProvider, targetPath, type ProviderScope } from "@/lib/cloud-skills/providers";

export type ToolAngle = {
  /** Provider id from the registry, or null when we cannot tell. */
  id: string | null;
  label: string;
  /** Where the skills land for this tool (project scope by default). */
  path: string;
  /** Tool-specific reason the cloud library matters, one sentence. */
  pain: string;
};

/** Signature -> provider id. Order matters: first match wins. */
const SIGNATURES: [RegExp, string][] = [
  [/hermes/i, "hermes"],
  [/claude[-_ ]?code|claude[-_ ]?cli/i, "claude-code"],
  [/claude/i, "claude-desktop"],
  [/codex/i, "codex"],
  [/cursor/i, "cursor"],
  [/lovable/i, "lovable"],
  [/open[-_ ]?claw|openclaw/i, "open-claw"],
  [/windsurf|codeium/i, "windsurf"],
  [/copilot|vscode|visual[-_ ]?studio/i, "copilot"],
  [/zed/i, "zed"],
  [/gemini/i, "gemini-cli"],
  [/cline/i, "cline"],
  [/roo/i, "roo"],
  [/aider/i, "aider"],
];

const PAIN: Record<string, string> = {
  hermes: "Every Hermes session starts from whatever skills that machine happens to have.",
  "claude-code":
    "Your ~/.claude/skills folder only exists on one machine — a new laptop or a teammate starts from zero.",
  "claude-desktop":
    "Claude Desktop reads a local skills folder, so nothing follows you to the CLI or to another machine.",
  codex: "Codex reads skills from the repo, so every new repo means copying the same files again.",
  cursor:
    "Cursor rules live in .cursor/rules per project, so a good rule you wrote once never reaches the next repo.",
  lovable: "Skills you activate in one Lovable project do not exist in the next one.",
  "open-claw": "OpenClaw discovers skills at session start from local folders only.",
  windsurf: "Windsurf rules are per workspace, so your best prompts stay trapped in one repo.",
  copilot: "Copilot instructions live in .github/instructions, one copy per repository.",
  zed: "Zed reads .rules from each project, so nothing carries across repos.",
  "gemini-cli": "Gemini CLI loads skills referenced by the local GEMINI.md only.",
  cline: "Cline rules are per workspace, so each repo needs its own copy.",
  roo: "Roo reads workspace rules, so nothing is shared between projects.",
  aider: "Aider reads local convention files, one set per checkout.",
};

const GENERIC_PAIN =
  "Your skills live wherever you happened to write them, so each new repo, machine or tool starts from zero.";

export function detectToolId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  for (const [re, id] of SIGNATURES) if (re.test(raw)) return id;
  return null;
}

/** Best-guess primary tool from every client name we have seen for a user. */
export function toolAngle(clientNames: string[], scope: ProviderScope = "project"): ToolAngle {
  for (const name of clientNames) {
    const id = detectToolId(name);
    const p = id ? getProvider(id) : null;
    if (!p) continue;
    const useScope = p.dirs[scope] ? scope : (Object.keys(p.dirs)[0] as ProviderScope);
    return {
      id: p.id,
      label: p.label,
      path: targetPath(p, useScope, "<your-skill>") ?? "",
      pain: PAIN[p.id] ?? GENERIC_PAIN,
    };
  }
  return {
    id: null,
    label: "your agent tools",
    path: ".agents/skills/<your-skill>/SKILL.md",
    pain: GENERIC_PAIN,
  };
}

/** All recognised tools, deduped — used to say "Cursor and Codex both read it". */
export function detectedTools(clientNames: string[]): { id: string; label: string }[] {
  const ids = new Set<string>();
  for (const n of clientNames) {
    const id = detectToolId(n);
    if (id) ids.add(id);
  }
  return [...ids].map((id) => ({ id, label: getProvider(id)?.label ?? id }));
}

export type UsagePattern =
  | "reviewer" // measures documents, cares about scores
  | "author" // uploads/publishes their own skills
  | "builder" // builds agents, runs residencies
  | "installer" // consumes marketplace skills
  | "explorer"; // connected, little else

export type UsageProfileInput = {
  reviews: number;
  uploads: number;
  published: number;
  agents: number;
  residencies: number;
  installs: number;
};

export function usagePattern(u: UsageProfileInput): UsagePattern {
  const scores: [UsagePattern, number][] = [
    ["author", u.uploads * 2 + u.published * 3],
    ["builder", u.agents * 2 + u.residencies * 2],
    ["reviewer", u.reviews * 1.5],
    ["installer", u.installs],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [best, score] = scores[0]!;
  return score > 0 ? best : "explorer";
}

export const PATTERN_LABELS: Record<UsagePattern, string> = {
  reviewer: "Measures and improves documents",
  author: "Writes and publishes skills",
  builder: "Builds and trains agents",
  installer: "Installs verified skills",
  explorer: "Connected, exploring",
};

/** Pattern-specific hook line for the cloud-library upsell. */
export function patternHook(pattern: UsagePattern, tool: ToolAngle): string {
  switch (pattern) {
    case "author":
      return `You write your own skills, and right now the only copy lives next to ${tool.label}.`;
    case "builder":
      return `You build agents — the souls, playbooks and skills behind them should follow you into ${tool.label} and everything else you use.`;
    case "reviewer":
      return `You already measured your documents; keeping the graded versions in one private library is what makes those scores reusable in ${tool.label}.`;
    case "installer":
      return `You install verified skills, but each install lands in a single project instead of your whole ${tool.label} setup.`;
    case "explorer":
      return `You connected ${tool.label} — the next step is a library it can pull from on any machine.`;
  }
}

/** Bullets tuned to the tool + pattern, always 3 items. */
export function personalizedBullets(pattern: UsagePattern, tool: ToolAngle): string[] {
  const first =
    tool.id
      ? `One call writes every skill straight to \`${tool.path}\` for ${tool.label}`
      : "One call writes every skill at the exact path your tool reads";
  const second =
    pattern === "author" || pattern === "builder"
      ? "Version history and changelog per skill, so you can roll back a bad edit"
      : "Conflict handling built in: overwrite, merge or keep both when a file already exists";
  return [
    first,
    second,
    `Private to your account — never shared with other users — and portable to ${
      PROVIDERS.length
    } agent tools`,
  ];
}
