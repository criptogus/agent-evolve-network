#!/usr/bin/env node
// Rug-pull check (NVIDIA SkillSpector `--mcp-registry-compare` import).
//
// Compares a PUBLISHED manifest (snapshots captured at release time) against
// the package files currently in the working tree. Flags the attack where a
// package keeps its identity (slug + version + publisher) but its content or
// tool surface silently changes.
//
// Usage:
//   node --experimental-strip-types scripts/check-rug-pull.ts --manifest published.json
//   node --experimental-strip-types scripts/check-rug-pull.ts --manifest published.json --fail-on-findings
//   node --experimental-strip-types scripts/check-rug-pull.ts --write-manifest published.json
//
// Exit codes: 0 = clean, 1 = rug-pull findings (with --fail-on-findings), 2 = usage/IO error.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  detectRugPull,
  packageContentHash,
  type PackageSnapshot,
} from "../src/lib/marketplace/rug-pull.ts";

const ROOT = new URL("..", import.meta.url).pathname;

const args = parseArgs(process.argv.slice(2));
const contentDir = join(
  ROOT,
  "content",
  typeof args.content === "string" ? args.content : "skills",
);
const current = snapshotsFromContent(contentDir);

if (args["write-manifest"]) {
  const target = resolve(String(args["write-manifest"]));
  writeFileSync(target, `${JSON.stringify({ packages: current }, null, 2)}\n`);
  console.log(`Wrote ${current.length} package snapshots to ${target}`);
  process.exit(0);
}

const manifestPath = args.manifest ? resolve(String(args.manifest)) : null;
if (!manifestPath) {
  console.error(
    "Usage: --manifest published.json [--content dir] [--fail-on-findings] | --write-manifest out.json",
  );
  process.exit(2);
}

/** Harvest slugs + versions + tool lists from the content tree. */
function snapshotsFromContent(dir: string): PackageSnapshot[] {
  const out: PackageSnapshot[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    let pkg: Record<string, unknown>;
    try {
      pkg = parseYaml(readFileSync(full, "utf8"));
    } catch {
      continue;
    }
    if (!pkg || typeof pkg !== "object" || typeof pkg.slug !== "string") continue;
    out.push({
      slug: pkg.slug,
      version: typeof pkg.version === "string" ? pkg.version : "0.0.0",
      content_sha256: packageContentHash(pkg),
      publisher: typeof pkg.author === "string" ? pkg.author : undefined,
      tools: Array.isArray(pkg.tools)
        ? pkg.tools.map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
        : undefined,
    });
  }
  return out;
}

if (args["write-manifest"]) {
  const target = resolve(String(args["write-manifest"]));
  writeFileSync(target, `${JSON.stringify({ packages: current }, null, 2)}\n`);
  console.log(`Wrote ${current.length} package snapshots to ${target}`);
  process.exit(0);
}

let manifest: { packages?: PackageSnapshot[] };
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(
    `Cannot read manifest ${manifestPath}: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(2);
}
const published = Array.isArray(manifest) ? manifest : (manifest.packages ?? []);
const byCurrent = new Map(current.map((s) => [s.slug, s]));

let findings = 0;
for (const previous of published) {
  const candidate = byCurrent.get(previous.slug);
  if (!candidate) continue; // removed packages are a separate (also important) review
  const report = detectRugPull(previous, candidate);
  for (const f of report.findings) {
    findings++;
    console.log(
      `\x1b[31mRUG PULL\x1b[0m ${f.slug}@${f.version} [${f.kind}] (${f.severity})\n  ${f.detail}`,
    );
  }
}

if (findings === 0) {
  console.log(
    `\x1b[32m✓\x1b[0m No rug pulls: ${published.length} published snapshot(s) checked against ${contentDir}.`,
  );
  process.exit(0);
}
console.log(
  `\n${findings} rug-pull finding(s). Same-version content changes are never legitimate.`,
);
process.exit(args["fail-on-findings"] ? 1 : 0);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
