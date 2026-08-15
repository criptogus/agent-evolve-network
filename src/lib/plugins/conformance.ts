/**
 * Agent Plugins v1 conformance suite.
 *
 * Pure: takes a plugin-root-relative file map (path -> UTF-8 text) and returns
 * a deterministic list of checks. The admin upload panel, the server publish
 * path and the tests all run this exact suite, so "validated in the panel"
 * and "conformant on /plugins" can never drift apart.
 */
import {
  validatePluginManifest,
  validateMcpConfig,
  isValidPluginName,
  type PluginManifest,
} from "./agent-plugins";

export type CheckLevel = "required" | "recommended";
export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export type ConformanceCheck = {
  id: string;
  title: string;
  level: CheckLevel;
  status: CheckStatus;
  /** Human-readable explanation, always English. */
  detail: string;
};

export type ConformanceReport = {
  /** True only when every required check passes. Publishing is gated on this. */
  conformant: boolean;
  checks: ConformanceCheck[];
  failed: number;
  warnings: number;
  /** Parsed manifest when it is valid JSON, else null. */
  manifest: PluginManifest | null;
  /** skills/<name> directories that contain a SKILL.md. */
  skills: Array<{ dir: string; name: string; description: string; bytes: number }>;
};

export const MAX_FILES = 200;
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "md",
  "mdx",
  "json",
  "yaml",
  "yml",
  "txt",
  "toml",
  "csv",
  "sh",
  "py",
  "js",
  "ts",
  "sql",
]);

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "embedded private key"],
  [/\bsk-[A-Za-z0-9]{20,}\b/, "OpenAI-style secret key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, "GitHub token"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, "Slack token"],
  [/\bsb_secret_[A-Za-z0-9_-]{10,}\b/, "backend service key"],
];

function bytesOf(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Minimal YAML frontmatter reader — the SKILL.md spec only uses flat keys. */
export function readFrontmatter(md: string): Record<string, string> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md.trimStart());
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    out[kv[1]!.toLowerCase()] = kv[2]!.trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

export function runPluginConformance(files: Map<string, string>): ConformanceReport {
  const checks: ConformanceCheck[] = [];
  const add = (c: ConformanceCheck) => checks.push(c);
  const paths = [...files.keys()].sort();

  // ---- container hygiene -------------------------------------------------
  const totalBytes = paths.reduce((n, p) => n + bytesOf(files.get(p)!), 0);
  const oversize = paths.filter((p) => bytesOf(files.get(p)!) > MAX_FILE_BYTES);
  const badPaths = paths.filter(
    (p) =>
      p.startsWith("/") ||
      p.includes("..") ||
      p.split("/").some((seg) => seg === "" || seg === ".git" || seg === "node_modules") ||
      /[\\:*?"<>|]/.test(p),
  );
  const badExt = paths.filter((p) => {
    const seg = p.split("/").pop()!;
    if (!seg.includes(".")) return true;
    return !ALLOWED_EXTENSIONS.has(seg.split(".").pop()!.toLowerCase());
  });

  add({
    id: "package.nonempty",
    title: "Package contains files",
    level: "required",
    status: paths.length > 0 ? "pass" : "fail",
    detail: paths.length > 0 ? `${paths.length} file(s) read from the archive.` : "The archive is empty.",
  });
  add({
    id: "package.size",
    title: "Size limits respected",
    level: "required",
    status: paths.length <= MAX_FILES && totalBytes <= MAX_TOTAL_BYTES && oversize.length === 0 ? "pass" : "fail",
    detail:
      oversize.length > 0
        ? `Files over 256 KB: ${oversize.slice(0, 3).join(", ")}`
        : `${paths.length}/${MAX_FILES} files, ${(totalBytes / 1024).toFixed(0)} KB of ${MAX_TOTAL_BYTES / 1024} KB.`,
  });
  add({
    id: "package.paths",
    title: "Paths stay inside the plugin root",
    level: "required",
    status: badPaths.length === 0 ? "pass" : "fail",
    detail: badPaths.length === 0 ? "No absolute paths, traversal or VCS metadata." : `Rejected: ${badPaths.slice(0, 3).join(", ")}`,
  });
  add({
    id: "package.text-only",
    title: "Text-only, no binaries or executables",
    level: "required",
    status: badExt.length === 0 ? "pass" : "fail",
    detail: badExt.length === 0 ? "Every entry has an allowed text extension." : `Not allowed: ${badExt.slice(0, 3).join(", ")}`,
  });

  // ---- secrets -----------------------------------------------------------
  const leaks: string[] = [];
  for (const p of paths) {
    const content = files.get(p)!;
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(content)) leaks.push(`${p}: ${label}`);
    }
  }
  add({
    id: "security.no-secrets",
    title: "No credentials committed",
    level: "required",
    status: leaks.length === 0 ? "pass" : "fail",
    detail: leaks.length === 0 ? "No key or token patterns found." : leaks.slice(0, 3).join(" · "),
  });

  // ---- plugin.json -------------------------------------------------------
  const rawManifest = files.get("plugin.json");
  let manifest: PluginManifest | null = null;
  if (!rawManifest) {
    add({
      id: "manifest.present",
      title: "Root plugin.json present",
      level: "required",
      status: "fail",
      detail: "Agent Plugins v1 requires a plugin.json at the package root.",
    });
    add({ id: "manifest.schema", title: "plugin.json matches the v1 schema", level: "required", status: "skip", detail: "No manifest to validate." });
  } else {
    let parsed: unknown = null;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(rawManifest);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }
    add({
      id: "manifest.present",
      title: "Root plugin.json present",
      level: "required",
      status: parseError ? "fail" : "pass",
      detail: parseError ? `plugin.json is not valid JSON: ${parseError}` : "Found and parsed plugin.json.",
    });
    const errors = parseError ? ["unparseable JSON"] : validatePluginManifest(parsed);
    add({
      id: "manifest.schema",
      title: "plugin.json matches the v1 schema",
      level: "required",
      status: errors.length === 0 ? "pass" : "fail",
      detail: errors.length === 0 ? "Closed schema, legal name, no unknown fields." : errors.slice(0, 4).join(" · "),
    });
    if (!parseError && errors.length === 0) manifest = parsed as PluginManifest;
    const name = (parsed as any)?.name;
    add({
      id: "manifest.name",
      title: "Plugin name is a legal identifier",
      level: "required",
      status: isValidPluginName(name) ? "pass" : "fail",
      detail: isValidPluginName(name) ? `name = ${name}` : `Illegal name: ${JSON.stringify(name ?? null)}`,
    });
    add({
      id: "manifest.metadata",
      title: "Version, description and license declared",
      level: "recommended",
      status:
        (parsed as any)?.version && (parsed as any)?.description && (parsed as any)?.license ? "pass" : "warn",
      detail:
        (parsed as any)?.version && (parsed as any)?.description && (parsed as any)?.license
          ? "All discovery metadata present."
          : "Add version, description and license so clients can display the plugin.",
    });
  }

  // ---- mcp.json ----------------------------------------------------------
  const rawMcp = files.get("mcp.json");
  if (!rawMcp) {
    add({
      id: "mcp.optional",
      title: "mcp.json is valid when present",
      level: "recommended",
      status: "warn",
      detail: "No mcp.json — clients will not auto-register an MCP server for this plugin.",
    });
  } else {
    let mcpErrors: string[] = [];
    try {
      mcpErrors = validateMcpConfig(JSON.parse(rawMcp));
    } catch (e) {
      mcpErrors = [`mcp.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`];
    }
    add({
      id: "mcp.optional",
      title: "mcp.json is valid when present",
      level: "required",
      status: mcpErrors.length === 0 ? "pass" : "fail",
      detail: mcpErrors.length === 0 ? "Transport, URL and headers are spec-legal." : mcpErrors.slice(0, 4).join(" · "),
    });
  }

  // ---- skills ------------------------------------------------------------
  const skillFiles = paths.filter((p) => /^skills\/[^/]+\/SKILL\.md$/.test(p));
  const skills: ConformanceReport["skills"] = [];
  const skillProblems: string[] = [];
  for (const p of skillFiles) {
    const content = files.get(p)!;
    const dir = p.split("/")[1]!;
    const fm = readFrontmatter(content);
    const name = fm["name"] ?? "";
    const description = fm["description"] ?? "";
    if (!name) skillProblems.push(`${p}: frontmatter is missing "name"`);
    if (!description) skillProblems.push(`${p}: frontmatter is missing "description"`);
    else if (description.length < 20) skillProblems.push(`${p}: description is too short to be useful`);
    const body = content.replace(/^---[\s\S]*?---/, "").trim();
    if (body.length < 200) skillProblems.push(`${p}: body is under 200 characters`);
    skills.push({ dir, name: name || dir, description, bytes: bytesOf(content) });
  }
  add({
    id: "skills.present",
    title: "At least one skills/<name>/SKILL.md",
    level: "required",
    status: skillFiles.length > 0 ? "pass" : "fail",
    detail: skillFiles.length > 0 ? `${skillFiles.length} skill component(s): ${skills.map((s) => s.dir).join(", ")}` : "No skill component found.",
  });
  add({
    id: "skills.frontmatter",
    title: "Every SKILL.md has name, description and substance",
    level: "required",
    status: skillFiles.length === 0 ? "skip" : skillProblems.length === 0 ? "pass" : "fail",
    detail: skillFiles.length === 0 ? "No skill component to check." : skillProblems.length === 0 ? "Frontmatter and body pass the spec floor." : skillProblems.slice(0, 4).join(" · "),
  });
  add({
    id: "docs.readme",
    title: "README.md explains the plugin",
    level: "recommended",
    status: files.has("README.md") ? "pass" : "warn",
    detail: files.has("README.md") ? "README.md found at the package root." : "Add a root README.md so humans can review the plugin.",
  });

  const failed = checks.filter((c) => c.level === "required" && c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  return { conformant: failed === 0, checks, failed, warnings, manifest, skills };
}
