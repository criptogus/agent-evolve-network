/**
 * Private export bundle: turns a set of cloud skills into the exact on-disk
 * layout a given agent tool expects, so the user can unzip it wherever they
 * want (no MCP, no network, no sharing).
 *
 * Pure: builds the file list only. Zipping happens server-side in
 * `bundle.server.ts`; the UI reuses this to preview paths.
 */
import {
  getProvider,
  renderSkillFile,
  targetPath,
  type Provider,
  type ProviderScope,
  type SkillForRender,
} from "./providers";

export type BundleFile = { path: string; content: string };

/** Global targets live under ~; inside a zip we stage them in `home/`. */
export function bundlePath(p: Provider, scope: ProviderScope, slug: string): string | null {
  const raw = targetPath(p, scope, slug);
  if (!raw) return null;
  return raw.startsWith("~/") ? `home/${raw.slice(2)}` : raw;
}

function manifest(
  provider: Provider,
  scope: ProviderScope,
  skills: SkillForRender[],
  files: BundleFile[],
): string {
  return `${JSON.stringify(
    {
      generator: "superagentskill.com",
      kind: "private-skill-bundle",
      visibility: "private",
      tool: { id: provider.id, label: provider.label, layout: provider.layout },
      scope,
      target_dir: provider.dirs[scope],
      skills: skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        version: s.version ?? 1,
        path: bundlePath(provider, scope, s.slug),
      })),
      file_count: files.length,
    },
    null,
    2,
  )}\n`;
}

function readme(provider: Provider, scope: ProviderScope, skills: SkillForRender[]): string {
  const dir = provider.dirs[scope]!;
  const isGlobal = scope === "global";
  return [
    `# Private skill bundle for ${provider.label}`,
    "",
    `${skills.length} skill${skills.length === 1 ? "" : "s"} from your SuperAgent Skill cloud library,`,
    `already shaped for ${provider.label} (${scope} scope, layout: ${provider.layout}).`,
    "",
    "## Install",
    "",
    isGlobal
      ? [
          "This bundle targets your home directory. From the unzipped folder:",
          "",
          "```bash",
          'bash install.sh        # copies home/* into "$HOME"',
          "```",
          "",
          `Or copy manually: everything under \`home/\` maps 1:1 onto \`$HOME\`, so \`home/${dir.replace(/^~\//, "")}/\` becomes \`${dir}/\`.`,
        ].join("\n")
      : [
          "This bundle targets a project root. From the unzipped folder, inside your repo:",
          "",
          "```bash",
          "bash install.sh        # copies the tool folders into the current repo",
          "```",
          "",
          `Or copy manually: drop the \`${dir.split("/")[0]}\` folder at the root of your project.`,
        ].join("\n"),
    "",
    "## What lands where",
    "",
    ...skills.map((s) => `- \`${bundlePath(provider, scope, s.slug)}\` — ${s.name}`),
    "",
    `> ${provider.note}`,
    "",
    "## Notes",
    "",
    "- This bundle is private: it was generated for your account and contains only your own skills.",
    "- `install.sh` never deletes files; existing files with the same name are backed up as `<file>.bak`.",
    "- Re-export any time to pick up new versions, or use the MCP tool `cloud_skills_sync` for in-place, conflict-aware syncing.",
  ].join("\n");
}

function installScript(provider: Provider, scope: ProviderScope): string {
  const dir = provider.dirs[scope]!;
  const root = scope === "global" ? "home" : dir.split("/")[0]!;
  const dest = scope === "global" ? '"$HOME"' : '"$PWD"';
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    `# Installs this private skill bundle for ${provider.label} (${scope} scope).`,
    `# Source: superagentskill.com — files are copied into ${scope === "global" ? "$HOME" : "the current directory"}.`,
    "",
    `SRC="$(cd "$(dirname "$0")" && pwd)/${root}"`,
    `DEST=${dest}`,
    "",
    'if [ ! -d "$SRC" ]; then echo "Nothing to install: $SRC missing" >&2; exit 1; fi',
    "",
    'find "$SRC" -type f | while read -r file; do',
    '  rel="${file#"$SRC"/}"',
    scope === "global" ? '  out="$DEST/$rel"' : `  out="$DEST/${root}/$rel"`,
    '  mkdir -p "$(dirname "$out")"',
    '  if [ -f "$out" ]; then cp "$out" "$out.bak"; echo "backup: $out.bak"; fi',
    '  cp "$file" "$out"',
    '  echo "wrote: $out"',
    "done",
    "",
    'echo "Done."',
    "",
  ].join("\n");
}

/** Full file list of the bundle, deterministic and sorted. */
export function buildBundleFiles(
  providerId: string,
  scope: ProviderScope,
  skills: SkillForRender[],
): { provider: Provider; files: BundleFile[] } {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown tool: ${providerId}`);
  if (!provider.dirs[scope]) throw new Error(`${provider.label} has no ${scope} scope`);

  const ordered = [...skills].sort((a, b) => a.slug.localeCompare(b.slug));
  const skillFiles: BundleFile[] = [];
  for (const s of ordered) {
    const path = bundlePath(provider, scope, s.slug);
    if (!path) continue;
    skillFiles.push({ path, content: renderSkillFile(provider, s) });
  }

  const files: BundleFile[] = [
    ...skillFiles,
    { path: "README.md", content: `${readme(provider, scope, ordered)}\n` },
    { path: "install.sh", content: installScript(provider, scope) },
    { path: "sak-bundle.json", content: manifest(provider, scope, ordered, skillFiles) },
  ].sort((a, b) => a.path.localeCompare(b.path));

  return { provider, files };
}

export function bundleFileName(providerId: string, scope: ProviderScope, count: number): string {
  const day = new Date().toISOString().slice(0, 10);
  return `sak-skills-${providerId}-${scope}-${count}-${day}.zip`;
}
