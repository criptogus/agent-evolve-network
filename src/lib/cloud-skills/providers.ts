/**
 * Agent provider registry — inspired by cross-provider skill managers (e.g. `asm`).
 *
 * A cloud skill lives once in the user's online library, but every agent tool
 * reads skills from a different directory with a slightly different file
 * convention. This registry is the single source of truth for where a skill
 * must land so the same library works in Hermes, Codex, Claude Code, Cursor, ...
 *
 * Pure data + pure functions: safe to import from client and server code.
 */

export type ProviderFormat = "skill-md" | "markdown" | "mdc";

export type AgentProvider = {
  id: string;
  label: string;
  /** Directory for the user-level (global) scope, `~` = home dir. */
  userDir: string;
  /** Directory for the project-level scope, relative to the repo root. */
  projectDir: string | null;
  format: ProviderFormat;
  /** True when the skill is one folder with a SKILL.md inside. */
  folderPerSkill: boolean;
  notes?: string;
};

export const AGENT_PROVIDERS: AgentProvider[] = [
  { id: "hermes", label: "Hermes", userDir: "~/.hermes/skills", projectDir: ".hermes/skills", format: "skill-md", folderPerSkill: true },
  { id: "claude", label: "Claude Code", userDir: "~/.claude/skills", projectDir: ".claude/skills", format: "skill-md", folderPerSkill: true },
  { id: "codex", label: "Codex", userDir: "~/.codex/skills", projectDir: ".codex/skills", format: "skill-md", folderPerSkill: true },
  { id: "cursor", label: "Cursor", userDir: "~/.cursor/rules", projectDir: ".cursor/rules", format: "mdc", folderPerSkill: false, notes: "Cursor reads flat .mdc rule files." },
  { id: "windsurf", label: "Windsurf", userDir: "~/.codeium/windsurf/memories", projectDir: ".windsurf/rules", format: "markdown", folderPerSkill: false },
  { id: "cline", label: "Cline", userDir: "~/.cline/skills", projectDir: ".clinerules", format: "markdown", folderPerSkill: false },
  { id: "roo", label: "Roo Code", userDir: "~/.roo/skills", projectDir: ".roo/rules", format: "markdown", folderPerSkill: false },
  { id: "continue", label: "Continue", userDir: "~/.continue/rules", projectDir: ".continue/rules", format: "markdown", folderPerSkill: false },
  { id: "copilot", label: "GitHub Copilot", userDir: "~/.config/github-copilot/instructions", projectDir: ".github/instructions", format: "markdown", folderPerSkill: false },
  { id: "opencode", label: "OpenCode", userDir: "~/.config/opencode/skills", projectDir: ".opencode/skills", format: "skill-md", folderPerSkill: true },
  { id: "zed", label: "Zed", userDir: "~/.config/zed/rules", projectDir: ".rules", format: "markdown", folderPerSkill: false },
  { id: "amp", label: "Amp", userDir: "~/.config/amp/skills", projectDir: ".amp/skills", format: "skill-md", folderPerSkill: true },
  { id: "gemini", label: "Gemini CLI", userDir: "~/.gemini/skills", projectDir: ".gemini/skills", format: "skill-md", folderPerSkill: true },
  { id: "aider", label: "Aider", userDir: "~/.aider/conventions", projectDir: "CONVENTIONS.d", format: "markdown", folderPerSkill: false },
  { id: "agents", label: "Generic (AGENTS.md)", userDir: "~/.agents/skills", projectDir: ".agents/skills", format: "skill-md", folderPerSkill: true },
];

export const PROVIDER_IDS = AGENT_PROVIDERS.map((p) => p.id);

export function getProvider(id: string): AgentProvider | null {
  const needle = id.trim().toLowerCase();
  return (
    AGENT_PROVIDERS.find((p) => p.id === needle) ??
    AGENT_PROVIDERS.find((p) => p.label.toLowerCase() === needle) ??
    null
  );
}

export type SyncScope = "user" | "project";

export function providerDir(provider: AgentProvider, scope: SyncScope): string {
  if (scope === "project" && provider.projectDir) return provider.projectDir;
  return provider.userDir;
}

/** Where a single skill slug must be written for this provider/scope. */
export function skillPath(provider: AgentProvider, scope: SyncScope, slug: string): string {
  const dir = providerDir(provider, scope);
  if (provider.folderPerSkill) return `${dir}/${slug}/SKILL.md`;
  const ext = provider.format === "mdc" ? "mdc" : "md";
  return `${dir}/${slug}.${ext}`;
}

export type CloudSkillLike = {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  version?: number | null;
  content: string;
};

/** Render a skill in the file format the provider expects. */
export function renderForProvider(provider: AgentProvider, skill: CloudSkillLike): string {
  const tags = skill.tags ?? [];
  const front: string[] = ["---", `name: ${skill.name}`, `slug: ${skill.slug}`];
  if (skill.description) front.push(`description: ${skill.description}`);
  if (provider.format === "mdc") {
    // Cursor rules use alwaysApply/globs style frontmatter.
    front.push("alwaysApply: false");
  }
  if (skill.category) front.push(`category: ${skill.category}`);
  if (tags.length) front.push(`tags: ${tags.join(", ")}`);
  if (skill.version) front.push(`version: ${skill.version}`);
  front.push(`source: superagentskill.com/account/cloud-skills`);
  front.push("---");
  return `${front.join("\n")}\n\n${skill.content.trim()}\n`;
}

export type InstalledEntry = { slug: string; version?: number | null };

export type SyncAction = {
  action: "create" | "update" | "unchanged" | "orphan";
  slug: string;
  path: string;
  version: number | null;
  installed_version?: number | null;
  content?: string;
};

/**
 * Diff the cloud library against what an agent reports as installed locally,
 * and produce the exact file writes/removals needed. Stateless by design: the
 * client owns the filesystem, we own the truth about content and versions.
 */
export function buildSyncPlan(args: {
  provider: AgentProvider;
  scope: SyncScope;
  skills: CloudSkillLike[];
  installed?: InstalledEntry[];
  includeContent?: boolean;
}): { actions: SyncAction[]; summary: Record<string, number> } {
  const { provider, scope, skills, installed = [], includeContent = true } = args;
  const installedMap = new Map(installed.map((e) => [e.slug, e.version ?? null]));
  const actions: SyncAction[] = [];

  for (const skill of skills) {
    const path = skillPath(provider, scope, skill.slug);
    const version = skill.version ?? null;
    const has = installedMap.has(skill.slug);
    const installedVersion = installedMap.get(skill.slug) ?? null;
    const upToDate = has && installedVersion != null && version != null && installedVersion >= version;
    const action: SyncAction["action"] = !has ? "create" : upToDate ? "unchanged" : "update";
    actions.push({
      action,
      slug: skill.slug,
      path,
      version,
      ...(has ? { installed_version: installedVersion } : {}),
      ...(action !== "unchanged" && includeContent
        ? { content: renderForProvider(provider, skill) }
        : {}),
    });
  }

  const cloudSlugs = new Set(skills.map((s) => s.slug));
  for (const entry of installed) {
    if (cloudSlugs.has(entry.slug)) continue;
    actions.push({
      action: "orphan",
      slug: entry.slug,
      path: skillPath(provider, scope, entry.slug),
      version: null,
      installed_version: entry.version ?? null,
    });
  }

  const summary = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.action] = (acc[a.action] ?? 0) + 1;
    return acc;
  }, {});

  return { actions, summary };
}
