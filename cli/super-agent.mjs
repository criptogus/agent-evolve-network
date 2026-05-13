#!/usr/bin/env node
// Super Agent Skill CLI — one-line distribution for any IDE/agent that reads
// local instruction files.
//
// Usage:
//   npx super-agent install <slug> [--target claude|cursor|continue|cline|all]
//   npx super-agent list [--query <q>]
//   npx super-agent search <q>
//   npx super-agent info <slug>
//
// Installs an Anthropic-compatible SKILL.md (or each target's local convention)
// into the current working directory. No login required for public packages —
// downloads via the public registry HTTPS endpoints.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REGISTRY = process.env.SUPER_AGENT_REGISTRY ?? "https://superagentskill.com";
const TELEMETRY = process.env.SUPER_AGENT_TELEMETRY !== "0";

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h") {
  printHelp(); process.exit(0);
}

try {
  if (cmd === "install") await cmdInstall(rest);
  else if (cmd === "list") await cmdList(rest);
  else if (cmd === "search") await cmdSearch(rest);
  else if (cmd === "info") await cmdInfo(rest);
  else { console.error(`unknown command: ${cmd}`); printHelp(); process.exit(1); }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(2);
}
// fetch keep-alive sockets can keep the loop alive ~30s; force a clean exit.
setImmediate(() => process.exit(0));

function printHelp() {
  console.log(`super-agent — install AI agent skills locally

Commands:
  install <slug> [--target claude|cursor|continue|cline|all]   default: all
  list   [--query <q>]
  search <q>
  info   <slug>

Environment:
  SUPER_AGENT_REGISTRY   override registry origin (default https://superagentskill.com)
  SUPER_AGENT_TELEMETRY  set to 0 to disable anonymized install telemetry
`);
}

function parseFlags(args) {
  const positional = []; const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) { const n = args[i + 1]; if (!n || n.startsWith("--")) flags[a.slice(2)] = true; else { flags[a.slice(2)] = n; i++; } }
    else positional.push(a);
  }
  return { positional, flags };
}

async function getJson(path) {
  const res = await fetch(`${REGISTRY}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.json();
}

async function getText(path) {
  const res = await fetch(`${REGISTRY}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.text();
}

async function cmdInstall(args) {
  const { positional, flags } = parseFlags(args);
  const slug = positional[0];
  if (!slug) throw new Error("install requires <slug>");
  const target = (flags.target ?? "all").toLowerCase();

  console.log(`→ fetching ${slug} from ${REGISTRY}`);
  const info = await getJson(`/api/public/packages/${slug}`);
  const skillMd = await getText(`/api/skills/${slug}/export.md`).catch(async () => {
    // Fallback: synthesize from the public manifest fields.
    return synthesizeSkillMd(info);
  });

  const targets = target === "all" ? ["claude", "cursor", "continue", "cline"] : [target];
  for (const t of targets) writeForTarget(t, slug, skillMd);

  reportTelemetry({ package_slug: slug, runtime: "cli", success: true });
  console.log(`\n✓ installed ${slug} for: ${targets.join(", ")}`);
  console.log(`  trust score: ${REGISTRY}/api/badges/trust/${slug}.svg`);
  console.log(`  package:     ${REGISTRY}/packs/${slug}`);
}

function writeForTarget(target, slug, skillMd) {
  const map = {
    claude:   `.claude/skills/${slug}/SKILL.md`,
    cursor:   `.cursor/rules/${slug}.mdc`,
    continue: `.continue/skills/${slug}.md`,
    cline:    `.cline/skills/${slug}.md`,
  };
  const path = map[target];
  if (!path) { console.warn(`  ! unknown target: ${target}`); return; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, skillMd);
  console.log(`  + ${path}`);
}

async function cmdList(args) {
  const { flags } = parseFlags(args);
  const q = flags.query ?? "";
  const list = await getJson(`/api/public/packages?type=skill${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  for (const p of list.items ?? list) {
    console.log(`${p.slug.padEnd(36)} ${p.name ?? ""}`);
  }
}

async function cmdSearch(args) {
  if (!args[0]) throw new Error("search requires a query");
  const res = await getJson(`/api/public/search?q=${encodeURIComponent(args.join(" "))}`);
  for (const r of res.results ?? []) {
    console.log(`${r.type.padEnd(10)} ${r.slug.padEnd(32)} ${r.score?.toFixed?.(2) ?? ""}  ${r.snippet ?? ""}`);
  }
}

async function cmdInfo(args) {
  const slug = args[0];
  if (!slug) throw new Error("info requires <slug>");
  const info = await getJson(`/api/public/packages/${slug}`);
  console.log(JSON.stringify(info, null, 2));
}

function synthesizeSkillMd(info) {
  const lines = [
    `# ${info.name ?? info.slug}`,
    ``,
    info.description ?? "",
    ``,
    `## When to use`,
    info.trigger ?? info.when_to_use ?? "(see package page)",
    ``,
    `## System prompt`,
    info.system_prompt ?? "(not exposed via this endpoint)",
    ``,
    `---`,
    `Installed from ${REGISTRY}/packs/${info.slug}`,
  ];
  return lines.join("\n");
}

function reportTelemetry(event) {
  if (!TELEMETRY) return;
  const body = JSON.stringify({ ...event, latency_ms: 0, workspace_id: hashCwd() });
  // Fire-and-forget; never block the CLI.
  fetch(`${REGISTRY}/api/telemetry`, {
    method: "POST", headers: { "content-type": "application/json" }, body,
  }).catch(() => {});
}

function hashCwd() {
  try {
    const cwd = process.cwd();
    const pkg = existsSync("package.json") ? JSON.parse(readFileSync("package.json", "utf8"))?.name : "";
    // No salt — server-side anonymization will hash again.
    return `${pkg || "anon"}:${cwd.split("/").slice(-2).join("/")}`;
  } catch { return "anon"; }
}
