#!/usr/bin/env node
// Marketplace security audit gate.
//
// Every package that is published to the marketplace (skills, playbooks,
// souls, integrations) is scanned for malicious content BEFORE it can be
// synced/released:
//   1. Prompt-injection / jailbreak signals — reuses the production guard in
//      src/lib/security/prompt-injection-guard.ts so the gate and the runtime
//      stay in sync.
//   2. Malicious "functions" — shell/network primitives embedded in a skill's
//      instructions that would make an agent exfiltrate data, run remote code,
//      wipe disks, or phone home to a non-allowlisted host.
//
// A package is BLOCKED (non-zero exit) when its worst finding is at or above
// the configured threshold (default: "high"). Lower-severity signals are
// reported as warnings but do not fail the build.
//
// Usage:  npm run audit:skills
//         node --experimental-strip-types scripts/audit-skills.mjs
//         node --experimental-strip-types scripts/audit-skills.mjs --json
//         AUDIT_REJECT_AT=critical npm run audit:skills

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { inspectContent } from "../src/lib/security/prompt-injection-guard.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const FOLDERS = ["skills", "playbooks", "souls", "integrations"];
const REJECT_AT = process.env.AUDIT_REJECT_AT || "high";
const JSON_OUT = process.argv.includes("--json");

const SEVERITY_RANK = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
const worse = (a, b) => (SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b);

// Hosts a skill is legitimately allowed to reference in its instructions.
// Anything else paired with an outbound verb is treated as exfiltration.
const ALLOWED_HOSTS = [
  "superagentskill.com",
  "github.com",
  "raw.githubusercontent.com",
  "api.github.com",
  "developer.mozilla.org",
  "owasp.org",
];

// Malicious-function heuristics layered on top of the prompt-injection guard.
// High precision, ordered most-dangerous first.
const CODE_RULES = [
  { label: "remote code execution (curl|wget piped to shell)", category: "malicious_function", severity: "critical",
    re: /\b(curl|wget|fetch)\b[^\n]{0,120}\|\s*(sudo\s+)?(ba|z|d|fi)?sh\b/gi },
  { label: "destructive filesystem wipe", category: "malicious_function", severity: "critical",
    re: /\brm\s+-[a-z]*r[a-z]*f?\b[^\n]{0,40}(\/|~|\$HOME|\*)/gi },
  { label: "disk overwrite (dd / mkfs)", category: "malicious_function", severity: "critical",
    re: /\b(dd\s+if=|mkfs(\.\w+)?\s|:\(\)\s*\{\s*:\|:&\s*\};:)/gi },
  { label: "dynamic code eval of decoded payload", category: "malicious_function", severity: "critical",
    re: /\b(eval|exec|Function|child_process|os\.system|subprocess|popen)\b[^\n]{0,60}\b(base64|atob|fromCharCode|decode|\$\()/gi },
  { label: "credential / dotenv exfiltration", category: "data_exfiltration", severity: "critical",
    re: /\b(cat|read|upload|post|send|exfiltrat\w*)\b[^\n]{0,60}(\.env|\.aws|\.ssh|id_rsa|credentials|secrets?\.(json|ya?ml)|process\.env)\b/gi },
  { label: "reverse shell", category: "malicious_function", severity: "critical",
    re: /\b(bash\s+-i|nc\s+-e|ncat|\/dev\/tcp\/|socat)\b[^\n]{0,60}(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\d{2,5})/gi },
  { label: "outbound request to embedded URL", category: "data_exfiltration", severity: "high",
    re: /\b(curl|wget|fetch|axios|requests?\.(get|post)|http\.request|navigator\.sendBeacon|XMLHttpRequest)\b[^\n]{0,80}https?:\/\/[^\s'"`)]+/gi },
  { label: "webhook / pastebin beacon", category: "data_exfiltration", severity: "high",
    re: /https?:\/\/(?:[^\s'"`)/]+\.)?(webhook\.site|requestbin\.\w+|pipedream\.net|ngrok\.[a-z]+|pastebin\.com|hookb\.in|burpcollaborator\.net|interactsh\.\w+|oast\.\w+)/gi },
  { label: "hardcoded private key / token", category: "data_exfiltration", severity: "high",
    re: /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}|\bghp_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{10,})/g },
  { label: "package install of arbitrary source", category: "malicious_function", severity: "medium",
    re: /\b(npm\s+i(nstall)?|pip\s+install|gem\s+install|go\s+install)\b[^\n]{0,80}(https?:\/\/|git\+|github:[^\s]+\/)/gi },
  { label: "obfuscated payload (long base64 / hex blob)", category: "encoding_evasion", severity: "medium",
    re: /\b(?:[A-Za-z0-9+/]{120,}={0,2}|(?:\\x[0-9a-fA-F]{2}){40,})\b/g },
];

// Marketplace-generated boilerplate that is structurally safe but trips the
// generic "force tool invocation" pattern. Stripped before scanning so the
// gate stays high-precision.
const BENIGN_BOILERPLATE = [
  /ask the agent to invoke this skill by name[^.]*?trigger phrases?[^.]*?\./gis,
];

// Tags that mark a package as a deliberate security / red-team fixture. For
// these, quoted attack strings inside `examples` are the product, not an
// attack on the running agent, so injection-class findings there are demoted.
const SECURITY_FIXTURE_TAGS = new Set([
  "security", "red-team", "redteam", "adversarial", "ai-safety", "owasp-llm",
]);
const DEMOTE_IN_EXAMPLES = new Set([
  "instruction_override", "role_hijack", "system_prompt_leak",
  "policy_bypass", "encoding_evasion",
]);
const DEMOTE = { critical: "medium", high: "low", medium: "low", low: "none", none: "none" };

function urlHost(u) {
  try { return new URL(u).host.toLowerCase(); } catch { return ""; }
}

// Demote an "outbound request" finding to low if it only targets an
// allowlisted host (docs links etc.), to keep false positives down.
function effectiveSeverity(rule, matchText) {
  if (rule.label.startsWith("outbound request")) {
    const url = matchText.match(/https?:\/\/[^\s'"`)]+/);
    if (url) {
      const host = urlHost(url[0]);
      if (ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "low";
    }
  }
  return rule.severity;
}

function scanCode(text) {
  const findings = [];
  let max = "none";
  for (const rule of CODE_RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      const sev = effectiveSeverity(rule, m[0]);
      const start = Math.max(0, m.index - 20);
      findings.push({
        pattern: rule.label,
        category: rule.category,
        severity: sev,
        excerpt: text.slice(start, m.index + m[0].length + 20).slice(0, 160).replace(/\s+/g, " "),
        offset: m.index,
      });
      max = worse(max, sev);
      if (!rule.re.global) break;
    }
  }
  return { findings, severity: max };
}

// Collect every string an LLM would read, grouped by originating field so the
// gate can apply field-aware rules (e.g. demote attack strings inside the
// `examples` of a declared security fixture).
function harvestFields(pkg) {
  const flatten = (v, acc) => {
    if (typeof v === "string") acc.push(v);
    else if (Array.isArray(v)) v.forEach((x) => flatten(x, acc));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => flatten(x, acc));
    return acc;
  };
  const fields = {};
  for (const k of [
    "description", "long_description", "system_prompt", "agent_footer",
    "rules", "examples", "persona", "instructions", "steps", "body",
  ]) {
    if (pkg[k] == null) continue;
    let text = flatten(pkg[k], []).join("\n");
    for (const re of BENIGN_BOILERPLATE) text = text.replace(re, " ");
    fields[k] = text;
  }
  return fields;
}

// Audit a single parsed package object. Exported for unit tests.
export function auditPackage(pkg) {
  const fields = harvestFields(pkg);
  const tags = Array.isArray(pkg.tags) ? pkg.tags.map((t) => String(t).toLowerCase()) : [];
  const isFixture = tags.some((t) => SECURITY_FIXTURE_TAGS.has(t));
  const findings = [];
  let severity = "none";
  for (const [field, text] of Object.entries(fields)) {
    const inj = inspectContent(text, { fence: false, rejectAtOrAbove: "critical" });
    const code = scanCode(text);
    for (const f of [...inj.findings, ...code.findings]) {
      let sev = f.severity;
      if (isFixture && (field === "examples" || field === "description" || field === "long_description")
          && DEMOTE_IN_EXAMPLES.has(f.category)) {
        sev = DEMOTE[sev];
      }
      if (sev === "none") continue;
      findings.push({ ...f, severity: sev, field });
      severity = worse(severity, sev);
    }
  }
  const blocked = SEVERITY_RANK[severity] >= SEVERITY_RANK[REJECT_AT];
  return { severity, blocked, findings };
}

function main() {
const results = [];
let blocked = 0;
let totalFindings = 0;

for (const folder of FOLDERS) {
  const dir = join(ROOT, "content", folder);
  let entries;
  try { entries = readdirSync(dir); } catch { continue; }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (!statSync(full).isFile() || !/\.ya?ml$/i.test(entry)) continue;
    if (basename(entry).startsWith("_")) continue;

    let pkg;
    try { pkg = parseYaml(readFileSync(full, "utf8")); }
    catch { continue; }
    if (!pkg) continue;

    const { severity, blocked: reject, findings } = auditPackage(pkg);
    if (reject) blocked++;
    totalFindings += findings.length;

    if (findings.length) {
      results.push({
        file: full.replace(ROOT, ""),
        slug: pkg.slug ?? basename(entry),
        severity,
        blocked: reject,
        findings: findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
      });
    }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ rejectAt: REJECT_AT, blocked, results }, null, 2));
} else {
  const C = { red: "[31m", yellow: "[33m", green: "[32m", dim: "[2m", reset: "[0m" };
  if (!results.length) {
    console.log(`${C.green}✓${C.reset} No malicious or injection signals in any marketplace package.`);
  }
  for (const r of results.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])) {
    const tag = r.blocked ? `${C.red}BLOCKED${C.reset}` : `${C.yellow}WARN${C.reset}`;
    console.log(`\n${tag} ${r.file} ${C.dim}(worst: ${r.severity})${C.reset}`);
    for (const f of r.findings) {
      const col = SEVERITY_RANK[f.severity] >= 3 ? C.red : C.yellow;
      console.log(`  ${col}[${f.severity}]${C.reset} ${f.category} — ${f.pattern} ${C.dim}(${f.field})${C.reset}`);
      console.log(`    ${C.dim}@${f.offset}: …${f.excerpt}…${C.reset}`);
    }
  }
  console.log(
    `\nScanned content/{${FOLDERS.join(",")}} — ` +
    `${totalFindings} finding(s), ${blocked} package(s) at/above "${REJECT_AT}".`,
  );
}

process.exit(blocked > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
