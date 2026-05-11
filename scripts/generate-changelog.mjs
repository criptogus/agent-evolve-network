#!/usr/bin/env node
/**
 * Generate a Markdown changelog for a content release.
 *
 * Compares the current ref (default: HEAD) against the previous `content-v*`
 * tag and groups commits by category (Skills / Playbooks / Souls / Guardrails
 * / Schemas / Tooling / Other) based on the files they touched under content/.
 *
 * Pull-request numbers like "(#123)" are linked back to GitHub when the
 * GITHUB_REPOSITORY env var is set (it is, in Actions).
 *
 * Usage:
 *   node scripts/generate-changelog.mjs --version content-v1.2.0 [--from content-v1.1.0] [--out CHANGELOG.md]
 *
 * Prints the changelog to stdout AND writes it to --out (default: dist/release/CHANGELOG.md).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i >= 0) return argv[i + 1];
  return fallback;
}

const VERSION = (arg("version", process.env.VERSION) || "").trim();
if (!VERSION) {
  console.error("Missing --version (e.g. --version content-v1.2.0)");
  process.exit(2);
}

let FROM = arg("from", process.env.FROM_REF);
const TO = arg("to", "HEAD");
const OUT = arg("out", join(ROOT, "dist/release/CHANGELOG.md"));

const repo = (process.env.GITHUB_REPOSITORY || "").trim();
const repoUrl = repo ? `https://github.com/${repo}` : null;

if (!FROM) {
  // Last reachable content-v* tag before TO (excluding TO itself if it's a tag).
  try {
    FROM = git([
      "describe",
      "--tags",
      "--match",
      "content-v*",
      "--abbrev=0",
      `${TO}^`,
    ]).trim();
  } catch {
    // No previous tag — use root commit so we get the full history.
    FROM = git(["rev-list", "--max-parents=0", TO]).trim().split("\n")[0];
  }
}

console.error(`▸ Changelog ${FROM}..${TO} for ${VERSION}`);

// Git log entries: hash, subject, body, author, files (NUL-separated).
const RAW = git([
  "log",
  `${FROM}..${TO}`,
  "--no-merges",
  "--name-only",
  "--pretty=format:__COMMIT__%n%H%n%an%n%s",
]);

const commits = parseLog(RAW);

const groups = {
  Skills: [],
  Playbooks: [],
  Souls: [],
  Guardrails: [],
  Schemas: [],
  Tooling: [],
  Other: [],
};

for (const c of commits) {
  const buckets = new Set();
  for (const f of c.files) {
    if (f.startsWith("content/skills/")) buckets.add("Skills");
    else if (f.startsWith("content/playbooks/")) buckets.add("Playbooks");
    else if (f.startsWith("content/souls/")) buckets.add("Souls");
    else if (f.startsWith("content/guardrails/")) buckets.add("Guardrails");
    else if (f.startsWith("content/schemas/")) buckets.add("Schemas");
    else if (
      f.startsWith("scripts/") ||
      f.startsWith(".github/workflows/") ||
      f === "package.json"
    )
      buckets.add("Tooling");
  }
  if (buckets.size === 0) buckets.add("Other");
  for (const b of buckets) groups[b].push(c);
}

const lines = [];
lines.push(`# ${VERSION}`);
lines.push("");
lines.push(`_Comparing \`${shortRef(FROM)}\`..\`${shortRef(TO)}\`._`);
lines.push("");

const order = ["Skills", "Playbooks", "Souls", "Guardrails", "Schemas", "Tooling", "Other"];
let any = false;
for (const k of order) {
  const items = groups[k];
  if (!items.length) continue;
  any = true;
  lines.push(`## ${k} (${items.length})`);
  lines.push("");
  for (const c of items) lines.push(`- ${formatCommit(c)}`);
  lines.push("");
}
if (!any) {
  lines.push("_No changes detected since the previous release._");
  lines.push("");
}

if (repoUrl) {
  lines.push("---");
  lines.push("");
  lines.push(`**Full diff:** ${repoUrl}/compare/${FROM}...${TO}`);
  lines.push("");
}

const md = lines.join("\n");
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md);
process.stdout.write(md);

// ---------- helpers ----------

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function parseLog(raw) {
  const out = [];
  const blocks = raw.split("__COMMIT__\n").slice(1);
  for (const block of blocks) {
    const lines = block.split("\n");
    const hash = lines[0] ?? "";
    const author = lines[1] ?? "";
    const subject = lines[2] ?? "";
    // Files are everything after the subject line (git log --name-only output),
    // separated from the next commit by a blank line.
    const files = lines.slice(3).map((s) => s.trim()).filter(Boolean);
    if (!hash) continue;
    out.push({ hash, author, subject, files });
  }
  return out;
}

function formatCommit(c) {
  const subject = c.subject.replace(/\s+\(#(\d+)\)\s*$/, "");
  const prMatch = c.subject.match(/\(#(\d+)\)\s*$/);
  const prRef = prMatch
    ? repoUrl
      ? ` ([#${prMatch[1]}](${repoUrl}/pull/${prMatch[1]}))`
      : ` (#${prMatch[1]})`
    : "";
  const sha = c.hash.slice(0, 7);
  const shaRef = repoUrl ? `[\`${sha}\`](${repoUrl}/commit/${c.hash})` : `\`${sha}\``;
  return `${escapeMd(subject)}${prRef} — ${shaRef} _by ${escapeMd(c.author)}_`;
}

function shortRef(r) {
  return /^[0-9a-f]{40}$/i.test(r) ? r.slice(0, 7) : r;
}

function escapeMd(s) {
  return String(s).replace(/[<>]/g, (m) => ({ "<": "&lt;", ">": "&gt;" })[m]);
}
