/**
 * Server-only helpers for the admin plugin upload panel: unzip an uploaded
 * Agent Plugins v1 package, run the conformance suite, and only then land it
 * in the registry so it becomes reachable through /plugins.
 */
import JSZip from "jszip";
import { runPluginConformance, MAX_FILES, MAX_FILE_BYTES, type ConformanceReport } from "./conformance";
import { normalizePluginName } from "./agent-plugins";
import { readFrontmatter } from "./conformance";

/** Strip a single wrapping directory so both `plugin.json` layouts work. */
function stripCommonRoot(entries: Array<[string, string]>): Array<[string, string]> {
  if (entries.some(([p]) => p === "plugin.json")) return entries;
  const roots = new Set(entries.map(([p]) => p.split("/")[0]));
  if (roots.size !== 1) return entries;
  const root = `${[...roots][0]}/`;
  return entries
    .filter(([p]) => p.startsWith(root) && p.length > root.length)
    .map(([p, c]) => [p.slice(root.length), c] as [string, string]);
}

export async function readPluginZip(base64: string): Promise<Map<string, string>> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (e) {
    throw new Response(`Not a readable .zip archive: ${e instanceof Error ? e.message : String(e)}`, {
      status: 400,
    });
  }
  const files = Object.values(zip.files).filter((f) => !f.dir);
  if (files.length > MAX_FILES) throw new Response(`Archive has more than ${MAX_FILES} files`, { status: 400 });

  const entries: Array<[string, string]> = [];
  for (const f of files) {
    if (/(^|\/)(__MACOSX|\.DS_Store)(\/|$)/.test(f.name)) continue;
    const buf = await f.async("uint8array");
    if (buf.byteLength > MAX_FILE_BYTES * 4) {
      throw new Response(`${f.name} is too large to inspect`, { status: 400 });
    }
    entries.push([f.name.replace(/^\.\//, ""), new TextDecoder("utf-8", { fatal: false }).decode(buf)]);
  }
  return new Map(stripCommonRoot(entries));
}

export type ValidatedPlugin = {
  report: ConformanceReport;
  /** Files kept for the publish step, so a validated payload is republished verbatim. */
  files: Record<string, string>;
};

export async function validateZipPayload(base64: string): Promise<ValidatedPlugin> {
  const files = await readPluginZip(base64);
  return { report: runPluginConformance(files), files: Object.fromEntries(files) };
}

/** Convert a conformant plugin into the registry draft shape. */
export function pluginToDraft(files: Map<string, string>, report: ConformanceReport) {
  const manifest = report.manifest!;
  const slug = normalizePluginName(manifest.name);
  const primary = report.skills[0]!;
  const skillMd = files.get(`skills/${primary.dir}/SKILL.md`) ?? "";
  const fm = readFrontmatter(skillMd);
  const body = skillMd.replace(/^---[\s\S]*?---/, "").trim();
  const description = (manifest.description || primary.description || fm["description"] || "").slice(0, 400);
  return {
    slug,
    name: (fm["name"] || manifest.name).slice(0, 120),
    type: "skill" as const,
    description,
    long_description: body.slice(0, 12000),
    system_prompt: body,
    rules: [] as unknown[],
    examples: [] as unknown[],
    compatibility: { agent_plugins: "1.0.0", clients: ["hermes", "claude", "codex", "cursor"] },
    scopes: [] as unknown[],
  };
}
