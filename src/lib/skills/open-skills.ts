/**
 * Open Skills ecosystem (skills.sh) compatibility constants.
 *
 * The `skills` CLI installs skill packages straight from a GitHub repo laid out as
 * `skills/<name>/SKILL.md`. Our catalog is mirrored into that layout by
 * `scripts/build-skills-sh-mirror.mjs`, so any supported agent can install SAK skills
 * without MCP or an account.
 */

export const OPEN_SKILLS_REPO = "criptogus/agent-evolve-network";
export const OPEN_SKILLS_SITE = "https://skills.sh";

/** `npx skills add <owner/repo>` — installs the whole graded catalog. */
export const openSkillsInstallAll = `npx skills add ${OPEN_SKILLS_REPO}`;

/** `npx skills add <owner/repo>/<slug>` — installs a single skill. */
export function openSkillsInstallOne(slug: string) {
  return `npx skills add ${OPEN_SKILLS_REPO}/${slug}`;
}

export const openSkillsUpdate = "npx skills update";

/** Agents that the open Skills CLI writes configs for. */
export const OPEN_SKILLS_AGENTS = [
  "Claude Code",
  "Cursor",
  "Codex",
  "GitHub Copilot",
  "Windsurf",
  "Gemini CLI",
  "Cline",
  "Zed",
  "OpenCode",
  "Antigravity",
  "Goose",
  "Kiro CLI",
  "Roo",
  "Trae",
  "Droid",
  "Amp",
  "VS Code",
] as const;

/** Install routes we support, used by the docs compatibility matrix. */
export const INSTALL_ROUTES = [
  {
    id: "open-skills",
    label: "Open Skills CLI (skills.sh)",
    command: openSkillsInstallAll,
    account: false,
    trustScore: true,
    telemetry: false,
    note: "Copies SKILL.md files into your agent. Snapshot of the catalog; re-run `npx skills update` for changes.",
  },
  {
    id: "super-agent",
    label: "SAK CLI (npx super-agent)",
    command: "npx super-agent install <slug>",
    account: false,
    trustScore: true,
    telemetry: true,
    note: "Pins a version, reports execution telemetry and can wire MCP OAuth in one command.",
  },
  {
    id: "mcp",
    label: "MCP server",
    command: "https://superagentskill.com/api/mcp",
    account: false,
    trustScore: true,
    telemetry: true,
    note: "Always-current graded versions, plus review, diagnosis and before/after proof tools.",
  },
] as const;
