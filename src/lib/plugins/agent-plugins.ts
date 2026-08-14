/**
 * Agent Plugins v1 (https://agent-plugins.org) — manifest builders + validator.
 *
 * A plugin is a directory with a required root `plugin.json` (closed schema),
 * optional `skills/<name>/SKILL.md` components and an optional root `mcp.json`.
 * Everything here is pure so the build script, the public API routes and the
 * tests share exactly one implementation.
 */

export const AGENT_PLUGINS_VERSION = "1.0.0" as const;
export const AGENT_PLUGINS_SITE = "https://agent-plugins.org" as const;
export const PLUGIN_SCHEMA_URL =
  `https://agent-plugins.org/schemas/${AGENT_PLUGINS_VERSION}/plugin.schema.json` as const;
export const MCP_SCHEMA_URL =
  `https://agent-plugins.org/schemas/${AGENT_PLUGINS_VERSION}/mcp.schema.json` as const;

/** Our hosted MCP endpoint (WAF-free public path). */
export const SAK_MCP_URL = "https://superagentskill.com/api/public/mcp" as const;
export const SAK_SITE = "https://superagentskill.com" as const;
export const SAK_REPO = "https://github.com/criptogus/agent-evolve-network" as const;

/** Extension namespace we own for SAK-specific manifest data (§8). */
export const SAK_EXTENSION_NS = "com.superagentskill" as const;

export type PluginAuthor = { name?: string; email?: string; url?: string };

export type PluginManifest = {
  $schema: string;
  name: string;
  version?: string;
  description?: string;
  author?: PluginAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  extensions?: Record<string, unknown>;
};

export type McpServer =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string>; cwd?: string }
  | { type: "streamable-http" | "sse"; url: string; headers?: Record<string, string> };

export type McpConfig = { $schema: string; mcpServers: Record<string, McpServer> };

const MANIFEST_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

/**
 * Coerce any slug into a spec-legal plugin name (§5.5):
 * 1-64 chars of `a-z0-9-.`, alphanumeric first/last char, no `--` or `..`.
 */
export function normalizePluginName(input: string): string {
  let name = String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "")
    .slice(0, 64)
    .replace(/[^a-z0-9]+$/, "");
  if (!name) name = "sak-plugin";
  return name;
}

export function isValidPluginName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  if (name.length < 1 || name.length > 64) return false;
  if (!/^[a-z0-9.-]+$/.test(name)) return false;
  if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) return false;
  if (name.includes("--") || name.includes("..")) return false;
  return true;
}

export function buildPluginManifest(input: {
  name: string;
  version?: string | null;
  description?: string | null;
  homepage?: string | null;
  repository?: string | null;
  license?: string | null;
  keywords?: string[] | null;
  author?: PluginAuthor | null;
  extensions?: Record<string, unknown> | null;
}): PluginManifest {
  const manifest: PluginManifest = {
    $schema: PLUGIN_SCHEMA_URL,
    name: normalizePluginName(input.name),
  };
  if (input.version) manifest.version = String(input.version);
  if (input.description) {
    manifest.description = String(input.description).replace(/\s+/g, " ").trim().slice(0, 400);
  }
  if (input.author) manifest.author = input.author;
  if (input.homepage) manifest.homepage = input.homepage;
  if (input.repository) manifest.repository = input.repository;
  if (input.license) manifest.license = input.license;
  const keywords = (input.keywords ?? []).map((k) => String(k)).filter(Boolean).slice(0, 20);
  if (keywords.length) manifest.keywords = keywords;
  if (input.extensions) manifest.extensions = input.extensions;
  return manifest;
}

/**
 * Our hosted MCP server as a portable `mcp.json`. Never include credentials —
 * headers are visible package data and authorization is client-managed (§7.2.1).
 */
export function buildMcpConfig(url: string = SAK_MCP_URL, serverName = "superagentskill"): McpConfig {
  return {
    $schema: MCP_SCHEMA_URL,
    mcpServers: {
      [serverName]: { type: "streamable-http", url },
    },
  };
}

const CREDENTIAL_HEADERS = /^(authorization|proxy-authorization|cookie|x-api-key|api-key)$/i;

/** Returns a list of spec violations. Empty array means conformant. */
export function validatePluginManifest(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["manifest must be a JSON object"];
  }
  const m = input as Record<string, unknown>;
  if (m["$schema"] !== PLUGIN_SCHEMA_URL) {
    errors.push(`$schema must be exactly ${PLUGIN_SCHEMA_URL}`);
  }
  if (!isValidPluginName(m["name"])) {
    errors.push(`invalid plugin name: ${JSON.stringify(m["name"])}`);
  }
  for (const key of Object.keys(m)) {
    if (!MANIFEST_FIELDS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  for (const key of ["version", "description", "homepage", "repository", "license"] as const) {
    if (key in m && typeof m[key] !== "string") errors.push(`${key} must be a string`);
  }
  if ("keywords" in m) {
    const kw = m["keywords"];
    if (!Array.isArray(kw) || kw.some((k) => typeof k !== "string")) {
      errors.push("keywords must be an array of strings");
    }
  }
  if ("author" in m) {
    const a = m["author"];
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      errors.push("author must be an object");
    } else {
      for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
        if (!["name", "email", "url"].includes(k)) errors.push(`author.${k} is not allowed`);
        else if (typeof v !== "string") errors.push(`author.${k} must be a string`);
      }
    }
  }
  if ("extensions" in m) {
    const e = m["extensions"];
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      errors.push("extensions must be an object");
    } else {
      for (const ns of Object.keys(e as Record<string, unknown>)) {
        if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(ns)) {
          errors.push(`extension namespace must be reverse-domain: ${ns}`);
        }
      }
    }
  }
  return errors;
}

function isLoopbackHost(host: string): boolean {
  if (host === "localhost" || host === "[::1]") return true;
  return /^127(\.\d{1,3}){3}$/.test(host);
}

/** Returns a list of spec violations in an `mcp.json` document. */
export function validateMcpConfig(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["mcp.json must be a JSON object"];
  }
  const cfg = input as Record<string, unknown>;
  if (cfg["$schema"] !== MCP_SCHEMA_URL) errors.push(`$schema must be exactly ${MCP_SCHEMA_URL}`);
  for (const key of Object.keys(cfg)) {
    if (key !== "$schema" && key !== "mcpServers") errors.push(`unknown top-level field: ${key}`);
  }
  const servers = cfg["mcpServers"];
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    errors.push("mcpServers must be an object");
    return errors;
  }
  for (const [name, raw] of Object.entries(servers as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`${name}: server config must be an object`);
      continue;
    }
    const s = raw as Record<string, unknown>;
    const type = s["type"];
    if (type === "stdio") {
      for (const key of Object.keys(s)) {
        if (!["type", "command", "args", "env", "cwd"].includes(key)) {
          errors.push(`${name}: unknown field for stdio: ${key}`);
        }
      }
      const command = s["command"];
      if (typeof command !== "string" || !command) {
        errors.push(`${name}: command is required`);
      } else if (/\s/.test(command)) {
        errors.push(`${name}: command must be a single executable token`);
      } else if (command.includes("..")) {
        errors.push(`${name}: command must stay inside the plugin root`);
      } else if (command.startsWith(".") && !command.startsWith("./")) {
        errors.push(`${name}: plugin-relative command must begin with ./ (plugin root)`);
      }
      const cwd = s["cwd"];
      if (cwd !== undefined) {
        const ok =
          typeof cwd === "string" &&
          (cwd.startsWith("./") ||
            cwd === "${PLUGIN_ROOT}" ||
            cwd.startsWith("${PLUGIN_ROOT}/") ||
            cwd === "${PLUGIN_DATA}" ||
            cwd.startsWith("${PLUGIN_DATA}/"));
        if (!ok) errors.push(`${name}: cwd must be ./-relative or rooted at a placeholder`);
        else if (typeof cwd === "string" && cwd.includes("..")) {
          errors.push(`${name}: cwd must stay inside its root`);
        }
      }
    } else if (type === "streamable-http" || type === "sse") {
      for (const key of Object.keys(s)) {
        if (!["type", "url", "headers"].includes(key)) {
          errors.push(`${name}: unknown field for ${type}: ${key}`);
        }
      }
      const url = s["url"];
      if (typeof url !== "string" || !url) {
        errors.push(`${name}: url is required`);
      } else {
        let parsed: URL | null = null;
        try {
          parsed = new URL(url);
        } catch {
          errors.push(`${name}: url must be an absolute URL`);
        }
        if (parsed) {
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            errors.push(`${name}: url must use http or https`);
          }
          if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) {
            errors.push(`${name}: non-loopback url must use https`);
          }
          if (parsed.username || parsed.password) errors.push(`${name}: url must not carry userinfo`);
          if (parsed.hash) errors.push(`${name}: url must not carry a fragment`);
        }
      }
      const headers = s["headers"];
      if (headers !== undefined) {
        if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
          errors.push(`${name}: headers must be an object of strings`);
        } else {
          const seen = new Set<string>();
          for (const [h, v] of Object.entries(headers as Record<string, unknown>)) {
            if (typeof v !== "string") errors.push(`${name}: header ${h} must be a string`);
            if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(h)) {
              errors.push(`${name}: invalid header name ${h}`);
            }
            const lower = h.toLowerCase();
            if (seen.has(lower)) errors.push(`${name}: duplicate header name ${h}`);
            seen.add(lower);
            if (CREDENTIAL_HEADERS.test(h)) {
              errors.push(`${name}: credentials must not be embedded in headers (${h})`);
            }
          }
        }
      }
    } else {
      errors.push(`${name}: unknown transport type ${JSON.stringify(type)}`);
    }
  }
  return errors;
}

/** Convenience for the API routes: manifest for a single catalog skill. */
export function buildSkillPluginManifest(input: {
  slug: string;
  name?: string | null;
  description?: string | null;
  version?: string | null;
  license?: string | null;
  authorHandle?: string | null;
  tags?: string[] | null;
  trustScore?: number | null;
}): PluginManifest {
  return buildPluginManifest({
    name: input.slug,
    version: input.version ?? "0.1.0",
    description: input.description ?? `Graded agent skill: ${input.name ?? input.slug}.`,
    homepage: `${SAK_SITE}/marketplace/${input.slug}`,
    repository: SAK_REPO,
    license: input.license ?? "CC-BY-SA-4.0",
    keywords: input.tags ?? ["agent-skill", "trust-score"],
    author: { name: input.authorHandle ?? "Super Agent Skill", url: SAK_SITE },
    extensions: {
      [SAK_EXTENSION_NS]: {
        trust_page: `${SAK_SITE}/marketplace/trust/${input.slug}`,
        mcp_endpoint: SAK_MCP_URL,
        ...(typeof input.trustScore === "number" ? { trust_score: input.trustScore } : {}),
      },
    },
  });
}

export function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
