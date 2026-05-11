#!/usr/bin/env node
/**
 * Builds downloadable release bundles for the validated content registry.
 *
 * Output: dist/release/
 *   - skills-<version>.zip
 *   - playbooks-<version>.zip
 *   - souls-<version>.zip
 *   - guardrails-<version>.zip
 *   - super-agent-skill-content-<version>.zip   (everything)
 *   - manifest.json                              (machine-readable index of bundles)
 *
 * Each bundle ships with:
 *   - the validated *.yaml package files for that category
 *   - MANIFEST.json (list of {slug, version, name, file, sha256})
 *   - README.md (human-readable index)
 *   - LICENSE-CONTENT.md (CC BY-SA 4.0)
 *   - content/schemas/<type>.schema.json (so consumers can re-validate offline)
 *
 * Usage:
 *   node scripts/build-release-bundles.mjs --version content-v1.2.0
 *   VERSION=content-v1.2.0 node scripts/build-release-bundles.mjs
 *
 * Validation runs first — bad content aborts the release.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const OUT = join(ROOT, "dist/release");
const STAGE = join(ROOT, "dist/.stage");

const TYPES = ["skill", "playbook", "soul", "guardrail"];
const FOLDER = { skill: "skills", playbook: "playbooks", soul: "souls", guardrail: "guardrails" };

const argv = process.argv.slice(2);
const versionArg =
  argv.find((a) => a.startsWith("--version="))?.slice("--version=".length) ??
  (argv.includes("--version") ? argv[argv.indexOf("--version") + 1] : undefined);
const VERSION = (versionArg || process.env.VERSION || `content-v0.0.0-dev.${Date.now()}`).trim();

console.log(`▸ Building release bundles for ${VERSION}`);

// 1) Validate first — abort on any failure.
const validate = spawnSync(process.execPath, [join(ROOT, "scripts/validate-content.mjs")], {
  stdio: "inherit",
});
if (validate.status !== 0) {
  console.error("✗ Validation failed — aborting release build.");
  process.exit(validate.status ?? 1);
}

// 2) Reset output dirs
rmSync(OUT, { recursive: true, force: true });
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(STAGE, { recursive: true });

// 3) Collect packages by type
function collect(type) {
  const dir = join(ROOT, "content", FOLDER[type]);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/i.test(f) && !basename(f).startsWith("_"))
    .map((f) => {
      const full = join(dir, f);
      const raw = readFileSync(full, "utf8");
      const pkg = parseYaml(raw);
      const sha256 = createHash("sha256").update(raw).digest("hex");
      return {
        slug: pkg.slug,
        version: pkg.version,
        name: pkg.name ?? pkg.slug,
        description: pkg.description ?? "",
        file: f,
        sha256,
        path: full,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const byType = Object.fromEntries(TYPES.map((t) => [t, collect(t)]));
const totals = Object.fromEntries(TYPES.map((t) => [t, byType[t].length]));
const grandTotal = Object.values(totals).reduce((s, n) => s + n, 0);
console.log(
  `▸ Indexed ${grandTotal} packages — ${TYPES.map((t) => `${totals[t]} ${FOLDER[t]}`).join(", ")}`,
);

// 4) Stage and zip each category
const bundleManifests = [];

for (const type of TYPES) {
  const items = byType[type];
  if (items.length === 0) continue;

  const folder = FOLDER[type];
  const stageDir = join(STAGE, folder);
  mkdirSync(join(stageDir, folder), { recursive: true });
  mkdirSync(join(stageDir, "schemas"), { recursive: true });

  for (const it of items) {
    cpSync(it.path, join(stageDir, folder, it.file));
  }

  // schema for this type
  cpSync(
    join(ROOT, `content/schemas/${type}.schema.json`),
    join(stageDir, "schemas", `${type}.schema.json`),
  );

  const manifest = {
    bundle: folder,
    type,
    version: VERSION,
    generated_at: new Date().toISOString(),
    count: items.length,
    packages: items.map(({ path: _p, ...rest }) => rest),
  };
  writeFileSync(join(stageDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));

  writeFileSync(
    join(stageDir, "README.md"),
    renderCategoryReadme({ type, folder, version: VERSION, items }),
  );

  cpSync(join(ROOT, "LICENSE"), join(stageDir, "LICENSE-CODE.md"), { recursive: false });
  writeFileSync(join(stageDir, "LICENSE-CONTENT.md"), licenseContentText());

  const zipName = `${folder}-${VERSION}.zip`;
  const zipPath = join(OUT, zipName);
  zipDir(stageDir, zipPath);

  const zipSha = sha256File(zipPath);
  const zipBytes = statSync(zipPath).size;

  bundleManifests.push({
    bundle: folder,
    type,
    file: zipName,
    bytes: zipBytes,
    sha256: zipSha,
    count: items.length,
  });

  console.log(`  ✓ ${zipName} (${items.length} packages, ${human(zipBytes)})`);
}

// 5) "everything" bundle
const allStage = join(STAGE, "all");
mkdirSync(allStage, { recursive: true });
cpSync(join(ROOT, "content"), join(allStage, "content"), { recursive: true });
const allManifest = {
  bundle: "super-agent-skill-content",
  version: VERSION,
  generated_at: new Date().toISOString(),
  totals,
  grand_total: grandTotal,
  packages: Object.fromEntries(
    TYPES.map((t) => [FOLDER[t], byType[t].map(({ path: _p, ...rest }) => rest)]),
  ),
};
writeFileSync(join(allStage, "MANIFEST.json"), JSON.stringify(allManifest, null, 2));
writeFileSync(join(allStage, "README.md"), renderRootReadme({ version: VERSION, totals }));
writeFileSync(join(allStage, "LICENSE-CONTENT.md"), licenseContentText());

// Strip a leading "content-" so the file name doesn't read "...content-content-v1.0".
const FILE_VERSION = VERSION.replace(/^content-/, "");
const allZipName = `super-agent-skill-content-${FILE_VERSION}.zip`;
const allZipPath = join(OUT, allZipName);
zipDir(allStage, allZipPath);
const allBytes = statSync(allZipPath).size;
bundleManifests.unshift({
  bundle: "super-agent-skill-content",
  type: "all",
  file: allZipName,
  bytes: allBytes,
  sha256: sha256File(allZipPath),
  count: grandTotal,
});
console.log(`  ✓ ${allZipName} (${grandTotal} packages, ${human(allBytes)})`);

// 6) Top-level manifest
writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify(
    {
      release: VERSION,
      generated_at: new Date().toISOString(),
      grand_total: grandTotal,
      totals,
      bundles: bundleManifests,
    },
    null,
    2,
  ),
);

console.log(`▸ Done — assets in ${OUT}`);

// ---------- helpers ----------

function zipDir(dir, outFile) {
  // -r recurse, -q quiet, -X strip extra metadata for reproducible-ish zips
  execFileSync("zip", ["-rqX", outFile, "."], { cwd: dir, stdio: "inherit" });
}

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function renderCategoryReadme({ type, folder, version, items }) {
  const lines = [
    `# Super Agent Skill — ${cap(folder)} bundle`,
    ``,
    `Release: \`${version}\``,
    `Generated: ${new Date().toISOString()}`,
    `Packages: ${items.length}`,
    ``,
    `## What's inside`,
    ``,
    `- \`${folder}/*.yaml\` — validated ${type} packages (one per file)`,
    `- \`schemas/${type}.schema.json\` — JSON Schema to re-validate offline`,
    `- \`MANIFEST.json\` — machine-readable index with sha256 per file`,
    `- \`LICENSE-CONTENT.md\` — content is **CC BY-SA 4.0**`,
    ``,
    `## Packages`,
    ``,
    ...items.map((i) => `- \`${i.slug}\` v${i.version} — ${i.name}`),
    ``,
    `## Verify`,
    ``,
    "```bash",
    `unzip ${folder}-${version}.zip -d ${folder}`,
    `sha256sum ${folder}/${folder}/*.yaml`,
    "```",
    ``,
  ];
  return lines.join("\n");
}

function renderRootReadme({ version, totals }) {
  return [
    `# Super Agent Skill — Content release ${version}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Totals`,
    ``,
    ...TYPES.map((t) => `- ${cap(FOLDER[t])}: ${totals[t]}`),
    ``,
    `## Layout`,
    ``,
    "```",
    "content/",
    "  skills/      # *.yaml packages",
    "  playbooks/",
    "  souls/",
    "  guardrails/",
    "  schemas/     # JSON Schemas",
    "```",
    ``,
    `Content is licensed **CC BY-SA 4.0** (see LICENSE-CONTENT.md).`,
    ``,
  ].join("\n");
}

function licenseContentText() {
  return [
    `# Content license`,
    ``,
    `All package content (skills, playbooks, souls, guardrails) shipped in this`,
    `bundle is licensed under **Creative Commons Attribution-ShareAlike 4.0**`,
    `(CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/`,
    ``,
    `You are free to share and adapt the content for any purpose, even`,
    `commercially, under the following terms:`,
    ``,
    `- **Attribution** — credit "Super Agent Skill contributors" and link back`,
    `  to https://github.com/super-agent-skill/super-agent-skill`,
    `- **ShareAlike** — distribute derivatives under the same license.`,
    ``,
    `The validation tooling and platform code (separate repository) are`,
    `licensed under Apache 2.0.`,
    ``,
  ].join("\n");
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
