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
  {
    id: "agent-plugins",
    label: "Agent Plugin package (agent-plugins.org)",
    command: "https://superagentskill.com/api/public/plugins/<slug>.zip",
    account: false,
    trustScore: true,
    telemetry: false,
    note: "Portable Agent Plugins v1 package: plugin.json, mcp.json and skills/<slug>/SKILL.md. Load it in any conformant client.",
  },
] as const;

/* ------------------------------------------------------------------------- */
/* Agent Plugins v1 (https://agent-plugins.org)                              */
/* ------------------------------------------------------------------------- */

export const AGENT_PLUGINS_SITE = "https://agent-plugins.org";
export const AGENT_PLUGINS_SPEC_VERSION = "1.0.0";

/** Discovery index of every SAK skill available as a portable plugin package. */
export const AGENT_PLUGINS_INDEX_URL = "https://superagentskill.com/api/public/plugins.json";

/** Portable plugin package (.zip) for one skill. */
export function agentPluginZipUrl(slug: string) {
  return `https://superagentskill.com/api/public/plugins/${slug}.zip`;
}

/** Agent Plugins v1 manifest for one skill. */
export function agentPluginManifestUrl(slug: string) {
  return `https://superagentskill.com/api/public/plugins/${slug}/plugin.json`;
}

/** MCP server config (Agent Plugins v1 companion file) for one skill. */
export function agentPluginMcpUrl(slug: string) {
  return `https://superagentskill.com/api/public/plugins/${slug}/mcp.json`;
}

/** Agents / clients that read the Agent Plugins format. */
export const AGENT_PLUGINS_STEWARDS = ["Amazon", "Cursor", "Microsoft", "OpenAI", "Vercel"] as const;
