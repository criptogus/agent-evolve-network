#!/usr/bin/env node
/**
 * Auto-bump PLATFORM_VERSION and prepend a CHANGELOG entry.
 *
 * Invoked by .github/workflows/auto-bump-version.yml on every push to main.
 * Also runnable locally: `node scripts/bump-version.mjs [patch|minor|major]`.
 *
 * Logic (see docs/VERSIONING.md):
 *  - Inspect commits since the last version bump (tag `v<version>` or the
 *    last commit that touched src/lib/version.ts).
 *  - Classify:
 *      major  -> any commit body/subject contains "BREAKING CHANGE" or "!:"
 *      minor  -> any commit subject starts with "feat"
 *      patch  -> anything else (fixes, chore, docs, refactor, ...)
 *  - CLI arg overrides auto-detection.
 *  - No user-visible commits since last bump AND no override -> exit 0 (skip).
 *  - Rewrite src/lib/version.ts, package.json, CHANGELOG.md consistently.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FILE = resolve(ROOT, "src/lib/version.ts");
const PKG_FILE = resolve(ROOT, "package.json");
const CHANGELOG_FILE = resolve(ROOT, "CHANGELOG.md");

const overrideBump = process.argv[2];
if (overrideBump && !["patch", "minor", "major"].includes(overrideBump)) {
  console.error(`Unknown bump kind: ${overrideBump}`);
  process.exit(1);
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`Not semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function bump(v, kind) {
  const [maj, min, pat] = parseSemver(v);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

// ---------- read current version ----------
const versionSrc = readFileSync(VERSION_FILE, "utf8");
const curVerMatch = /export const PLATFORM_VERSION = "([^"]+)"/.exec(versionSrc);
const curStageMatch = /export const PLATFORM_STAGE: [^=]+= "([^"]+)"/.exec(versionSrc);
const curCodenameMatch = /export const PLATFORM_CODENAME = "([^"]+)"/.exec(versionSrc);
if (!curVerMatch || !curStageMatch || !curCodenameMatch) {
  console.error("Could not parse src/lib/version.ts");
  process.exit(1);
}
const currentVersion = curVerMatch[1];
const stage = curStageMatch[1];
const codename = curCodenameMatch[1];

// ---------- pick range of commits to analyze ----------
let range = "";
try {
  const lastTag = sh(`git tag --list "v*" --sort=-v:refname`).split("\n")[0];
  if (lastTag) range = `${lastTag}..HEAD`;
} catch {
  /* no tags */
}
if (!range) {
  // Fallback: commits that touched version.ts, take the most recent one.
  try {
    const lastBumpSha = sh(`git log -n1 --format=%H -- ${VERSION_FILE}`);
    if (lastBumpSha) range = `${lastBumpSha}..HEAD`;
  } catch {
    /* ignore */
  }
}
const gitLog = range
  ? sh(`git log ${range} --pretty=format:%s%n%b%n---END---`)
  : sh(`git log -n 20 --pretty=format:%s%n%b%n---END---`);

const commits = gitLog
  .split("---END---")
  .map((c) => c.trim())
  .filter(Boolean);

// ---------- classify ----------
function classify(commitList) {
  let hasFeat = false;
  for (const c of commitList) {
    const subject = c.split("\n")[0] ?? "";
    if (/BREAKING CHANGE/i.test(c)) return "major";
    if (/^[a-z]+(\([^)]+\))?!:/i.test(subject)) return "major";
    if (/^feat(\([^)]+\))?:/i.test(subject)) hasFeat = true;
  }
  return hasFeat ? "minor" : "patch";
}

const kind = overrideBump ?? classify(commits);

// Low-quality placeholder subjects that should never appear in the changelog.
const LOW_QUALITY = /^(changes?|update|updates|fix|fixes|wip|tweak|tweaks|misc|misc\.|minor|patch|refactor|cleanup|chore|edit|edits)\.?$/i;

function stripConventionalPrefix(s) {
  return s.replace(/^([a-z]+)(\([^)]+\))?!?:\s*/i, "").trim();
}

// Skip if nothing meaningful and no override.
const meaningful = commits.filter((c) => {
  const s = (c.split("\n")[0] ?? "").toLowerCase();
  if (!s) return false;
  if (s.startsWith("chore: bump platform version")) return false;
  if (/^(merge|revert)\b/i.test(s)) return false;
  return true;
});
if (!overrideBump && meaningful.length === 0) {
  console.log("No user-visible commits since last bump — skipping.");
  process.exit(0);
}

const nextVersion = bump(currentVersion, kind);
const today = new Date().toISOString().slice(0, 10);

// ---------- build changelog highlights from commit subjects ----------
const seen = new Set();
const highlights = meaningful
  .map((c) => (c.split("\n")[0] ?? "").trim())
  .map(stripConventionalPrefix)
  .filter(Boolean)
  .filter((s) => s.length >= 8) // reject 1-2 word noise
  .filter((s) => !LOW_QUALITY.test(s))
  .filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, 5);
if (highlights.length === 0) highlights.push("Housekeeping and minor improvements.");


const kindLabel = kind === "major" ? "major" : kind === "minor" ? "minor" : "patch";
const title =
  kind === "major"
    ? "Breaking release"
    : kind === "minor"
      ? "Feature update"
      : "Maintenance release";

// ---------- rewrite src/lib/version.ts ----------
let newVersionSrc = versionSrc
  .replace(
    /export const PLATFORM_VERSION = "[^"]+"/,
    `export const PLATFORM_VERSION = "${nextVersion}"`,
  )
  .replace(
    /export const PLATFORM_BUILD_DATE = "[^"]+"/,
    `export const PLATFORM_BUILD_DATE = "${today}"`,
  );

// Insert new CHANGELOG entry at the top of the array.
const entry =
  `  {\n` +
  `    version: "${nextVersion}",\n` +
  `    date: "${today}",\n` +
  `    kind: "${kindLabel}",\n` +
  `    title: ${JSON.stringify(title)},\n` +
  `    highlights: [\n` +
  highlights.map((h) => `      ${JSON.stringify(h)},`).join("\n") +
  `\n    ],\n` +
  `  },\n`;

newVersionSrc = newVersionSrc.replace(
  /export const CHANGELOG: ChangelogEntry\[\] = \[\n/,
  (m) => m + entry,
);

writeFileSync(VERSION_FILE, newVersionSrc);

// ---------- rewrite package.json ----------
const pkg = JSON.parse(readFileSync(PKG_FILE, "utf8"));
pkg.version = nextVersion;
writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + "\n");

// ---------- rewrite CHANGELOG.md ----------
const md = readFileSync(CHANGELOG_FILE, "utf8");
const mdEntry =
  `## [${nextVersion}] — ${today} — *${codename}* (${stage}) — ${title}\n\n` +
  `### Changed\n\n` +
  highlights.map((h) => `- ${h}`).join("\n") +
  `\n\n`;

// Insert after the first "## [" heading marker, or after the intro block.
const anchor = /\n## \[/;
const idx = md.search(anchor);
const newMd =
  idx === -1 ? md + "\n" + mdEntry : md.slice(0, idx + 1) + mdEntry + md.slice(idx + 1);
writeFileSync(CHANGELOG_FILE, newMd);

console.log(
  `Bumped ${currentVersion} -> ${nextVersion} (${kind}). ` +
    `${meaningful.length} commit(s) summarized.`,
);
