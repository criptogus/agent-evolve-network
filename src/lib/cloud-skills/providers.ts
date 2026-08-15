/**
 * Cross-provider target registry for the Cloud Skill Manager.
 *
 * Pure data + pure helpers (no I/O): the MCP sync tools, the account UI and the
 * docs all derive the exact same file paths, so an agent writing files locally
 * and the page telling the user where they landed can never disagree.
 *
 * A "target" is an agent tool (Claude Code, Cursor, Codex, Hermes, Lovable, ...)
 * plus a scope (global = user home, project = repo root) plus a layout that
 * decides the on-disk shape of a skill.
 */

export type SkillLayout =
  | "skill-folder" // <dir>/<slug>/SKILL.md  (Anthropic Agent Skills shape)
  | "flat-markdown" // <dir>/<slug>.md
  | "mdc"; // <dir>/<slug>.mdc (Cursor rules)

export type ProviderScope = "global" | "project";

export type Provider = {
  id: string;
  label: string;
  /** Directory per scope, relative to home (global) or repo root (project). */
  dirs: Partial<Record<ProviderScope, string>>;
  layout: SkillLayout;
  /** Short, human note shown in the UI and returned by the MCP tool. */
  note: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "hermes",
    label: "Hermes",
    dirs: { global: "~/.hermes/skills", project: ".hermes/skills" },
    layout: "skill-folder",
    note: "Reads SKILL.md folders; project scope wins over global.",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    dirs: { global: "~/.claude/skills", project: ".claude/skills" },
    layout: "skill-folder",
    note: "Official Agent Skills layout: one folder per skill with SKILL.md.",
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    dirs: { global: "~/.claude/skills" },
    layout: "skill-folder",
    note: "Shares the ~/.claude directory with Claude Code.",
  },
  {
    id: "codex",
    label: "OpenAI Codex CLI",
    dirs: { global: "~/.codex/skills", project: ".codex/skills" },
    layout: "skill-folder",
    note: "Reference skills from AGENTS.md so Codex loads them on demand.",
  },
  {
    id: "cursor",
    label: "Cursor",
    dirs: { global: "~/.cursor/rules", project: ".cursor/rules" },
    layout: "mdc",
    note: "Cursor rules use .mdc files; frontmatter stays at the top.",
  },
  {
    id: "lovable",
    label: "Lovable",
    dirs: { project: ".agents/skills" },
    layout: "skill-folder",
    note: "Drop skills in the repo, then activate them in Settings > Skills.",
  },
  {
    id: "open-claw",
    label: "OpenClaw",
    dirs: { global: "~/.openclaw/skills", project: ".openclaw/skills" },
    layout: "skill-folder",
    note: "Skill folders are discovered at session start.",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    dirs: { global: "~/.codeium/windsurf/memories", project: ".windsurf/rules" },
    layout: "flat-markdown",
    note: "Flat Markdown rules, one file per skill.",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    dirs: { project: ".github/instructions" },
    layout: "flat-markdown",
    note: "Copilot loads *.instructions.md style Markdown from the repo.",
  },
  {
    id: "zed",
    label: "Zed",
    dirs: { global: "~/.config/zed/rules", project: ".rules" },
    layout: "flat-markdown",
    note: "Project .rules is read automatically by the Zed agent.",
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    dirs: { global: "~/.gemini/skills", project: ".gemini/skills" },
    layout: "skill-folder",
    note: "Reference from GEMINI.md to load a skill in a session.",
  },
  {
    id: "cline",
    label: "Cline",
    dirs: { project: ".clinerules" },
    layout: "flat-markdown",
    note: "One Markdown file per rule inside .clinerules/.",
  },
  {
    id: "roo",
    label: "Roo Code",
    dirs: { project: ".roo/rules" },
    layout: "flat-markdown",
    note: "Workspace rules directory, flat Markdown.",
  },
  {
    id: "aider",
    label: "Aider",
    dirs: { project: ".aider/skills" },
    layout: "flat-markdown",
    note: "Add with /read-only or reference from CONVENTIONS.md.",
  },
  {
    id: "generic-agents-md",
    label: "Any agent (AGENTS.md convention)",
    dirs: { global: "~/.agents/skills", project: ".agents/skills" },
    layout: "skill-folder",
    note: "Portable fallback: SKILL.md folders referenced from AGENTS.md.",
  },
];

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id);

export function getProvider(id: string): Provider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export function scopesFor(p: Provider): ProviderScope[] {
  return (["project", "global"] as ProviderScope[]).filter((s) => !!p.dirs[s]);
}

/** Exact file path a skill takes on disk for this provider + scope. */
export function targetPath(p: Provider, scope: ProviderScope, slug: string): string | null {
  const dir = p.dirs[scope];
  if (!dir) return null;
  if (p.layout === "skill-folder") return `${dir}/${slug}/SKILL.md`;
  if (p.layout === "mdc") return `${dir}/${slug}.mdc`;
  return `${dir}/${slug}.md`;
}

export type SkillForRender = {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  version?: number | null;
  content: string;
};

/** SKILL.md-style body with YAML frontmatter, shaped for the target layout. */
export function renderSkillFile(p: Provider, skill: SkillForRender): string {
  const lines = [
    "---",
    `name: ${skill.name}`,
    `slug: ${skill.slug}`,
    ...(skill.description ? [`description: ${skill.description}`] : []),
    ...(skill.category ? [`category: ${skill.category}`] : []),
    ...(skill.tags?.length ? [`tags: ${skill.tags.join(", ")}`] : []),
    ...(skill.version ? [`version: ${skill.version}`] : []),
    ...(p.layout === "mdc" ? ["alwaysApply: false"] : []),
    "source: superagentskill.com/account/cloud-skills",
    "---",
  ];
  return `${lines.join("\n")}\n\n${skill.content.trim()}\n`;
}

/** Copy-paste prompt that makes an agent perform the sync itself. */
export function syncPrompt(providerId: string, scope: ProviderScope): string {
  const p = getProvider(providerId);
  const label = p?.label ?? providerId;
  return [
    `Sync my SuperAgent Skill cloud library into ${label} (${scope} scope).`,
    `Call the MCP tool cloud_skills_sync with { tool: "${providerId}", scope: "${scope}" },`,
    "then write every returned file at its exact path. Do not delete anything I did not ask you to delete.",
  ].join(" ");
}
