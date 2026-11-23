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
//         node --experimental-strip-types scripts/audit-skills.ts
//         node --experimental-strip-types scripts/audit-skills.ts --json
//         AUDIT_REJECT_AT=critical npm run audit:skills

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { inspectContent } from "../src/lib/security/prompt-injection-guard.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
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
  {
    label: "remote code execution (curl|wget piped to shell)",
    category: "malicious_function",
    severity: "critical",
    re: /\b(curl|wget|fetch)\b[^\n]{0,120}\|\s*(sudo\s+)?(ba|z|d|fi)?sh\b/gi,
  },
  {
    label: "destructive filesystem wipe",
    category: "malicious_function",
    severity: "critical",
    re: /\brm\s+-[a-z]*r[a-z]*f?\b[^\n]{0,40}(\/|~|\$HOME|\*)/gi,
  },
  {
    label: "disk overwrite (dd / mkfs)",
    category: "malicious_function",
    severity: "critical",
    re: /\b(dd\s+if=|mkfs(\.\w+)?\s|:\(\)\s*\{\s*:\|:&\s*\};:)/gi,
  },
  {
    label: "dynamic code eval of decoded payload",
    category: "malicious_function",
    severity: "critical",
    re: /\b(eval|exec|Function|child_process|os\.system|subprocess|popen)\b[^\n]{0,60}\b(base64|atob|fromCharCode|decode|\$\()/gi,
  },
  {
    label: "credential / dotenv exfiltration",
    category: "data_exfiltration",
    severity: "critical",
    re: /\b(cat|read|upload|post|send|exfiltrat\w*)\b[^\n]{0,60}(\.env|\.aws|\.ssh|id_rsa|credentials|secrets?\.(json|ya?ml)|process\.env)\b/gi,
  },
  {
    label: "reverse shell",
    category: "malicious_function",
    severity: "critical",
    re: /\b(bash\s+-i|nc\s+-e|ncat|\/dev\/tcp\/|socat)\b[^\n]{0,60}(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\d{2,5})/gi,
  },
  {
    label: "outbound request to embedded URL",
    category: "data_exfiltration",
    severity: "high",
    re: /\b(curl|wget|fetch|axios|requests?\.(get|post)|http\.request|navigator\.sendBeacon|XMLHttpRequest)\b[^\n]{0,80}https?:\/\/[^\s'"`)]+/gi,
  },
  {
    label: "webhook / pastebin beacon",
    category: "data_exfiltration",
    severity: "high",
    re: /https?:\/\/(?:[^\s'"`)/]+\.)?(webhook\.site|requestbin\.\w+|pipedream\.net|ngrok\.[a-z]+|pastebin\.com|hookb\.in|burpcollaborator\.net|interactsh\.\w+|oast\.\w+)/gi,
  },
  {
    label: "hardcoded private key / token",
    category: "data_exfiltration",
    severity: "high",
    re: /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}|\bghp_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{10,})/g,
  },
  {
    label: "package install of arbitrary source",
    category: "malicious_function",
    severity: "medium",
    re: /\b(npm\s+i(nstall)?|pip\s+install|gem\s+install|go\s+install)\b[^\n]{0,80}(https?:\/\/|git\+|github:[^\s]+\/)/gi,
  },
  {
    label: "obfuscated payload (long base64 / hex blob)",
    category: "encoding_evasion",
    severity: "medium",
    re: /\b(?:[A-Za-z0-9+/]{120,}={0,2}|(?:\\x[0-9a-fA-F]{2}){40,})\b/g,
  },
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
  "security",
  "red-team",
  "redteam",
  "adversarial",
  "ai-safety",
  "owasp-llm",
]);
const DEMOTE_IN_EXAMPLES = new Set([
  "instruction_override",
  "role_hijack",
  "system_prompt_leak",
  "policy_bypass",
  "encoding_evasion",
]);
const DEMOTE = { critical: "medium", high: "low", medium: "low", low: "none", none: "none" };

function urlHost(u) {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return "";
  }
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
        excerpt: text
          .slice(start, m.index + m[0].length + 20)
          .slice(0, 160)
          .replace(/\s+/g, " "),
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
    "description",
    "long_description",
    "system_prompt",
    "agent_footer",
    "rules",
    "examples",
    "persona",
    "instructions",
    "steps",
    "body",
    "when_to_use",
    "contract",
    "tools",
    "permissions",
  ]) {
    if (pkg[k] == null) continue;
    let text = flatten(pkg[k], []).join("\n");
    for (const re of BENIGN_BOILERPLATE) text = text.replace(re, " ");
    fields[k] = text;
  }
  return fields;
}

// Audit a single parsed package object. Exported for unit tests.
export function auditPackage(pkg, rejectAt = REJECT_AT) {
  if (!["low", "medium", "high", "critical"].includes(rejectAt))
    throw new Error(`Invalid rejection threshold: ${rejectAt}`);
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
      if (isFixture && field === "examples" && DEMOTE_IN_EXAMPLES.has(f.category)) {
        sev = DEMOTE[sev];
      }
      if (sev === "none") continue;
      findings.push({ ...f, severity: sev, field });
      severity = worse(severity, sev);
    }
  }
  const blocked = SEVERITY_RANK[severity] >= SEVERITY_RANK[rejectAt];
  return { severity, blocked, findings };
}

// Hash the bytes that were actually inspected; do not infer runtime safety.
export function auditContent(root = join(ROOT, "content"), rejectAt = REJECT_AT) {
  if (!["low", "medium", "high", "critical"].includes(rejectAt))
    throw new Error(`Invalid rejection threshold: ${rejectAt}`);
  const results = [];
  const errors = [];
  for (const folder of FOLDERS) {
    const dir = join(root, folder);
    let entries;
    try {
      entries = readdirSync(dir).sort();
    } catch {
      errors.push({ file: folder, error: "Cannot read content directory" });
      continue;
    }
    for (const entry of entries) {
      if (!/\.ya?ml$/i.test(entry) || basename(entry).startsWith("_")) continue;
      const file = join(folder, entry);
      try {
        const full = join(root, file);
        if (!statSync(full).isFile()) throw new Error("not a file");
        const bytes = readFileSync(full);
        const pkg = parseYaml(bytes.toString("utf8"));
        if (!pkg || typeof pkg !== "object" || Array.isArray(pkg))
          throw new Error("not a package object");
        const fields = harvestFields(pkg);
        if (!Object.values(fields).some((text) => text.trim()))
          throw new Error("no auditable content");
        const verdict = auditPackage(pkg, rejectAt);
        results.push({
          file,
          slug: pkg.slug ?? basename(entry),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
          ...verdict,
          status: verdict.blocked ? "blocked" : verdict.findings.length ? "review" : "no_signals",
        });
      } catch {
        // Parser diagnostics may contain source secrets. Keep reports content-free on errors.
        errors.push({
          file,
          error: "Unreadable, invalid YAML, or missing auditable package content",
        });
      }
    }
  }
  if (!results.length) errors.push({ file: ".", error: "No packages audited" });
  const blocked = results.filter((r) => r.blocked).length;
  return {
    schemaVersion: 1,
    scanner: "super-agent-local-heuristics",
    rejectAt,
    scope:
      "Known instruction fields in content YAML only; referenced files and runtime behavior are not scanned",
    scanned: results.length,
    blocked,
    failed: errors.length,
    totalFindings: results.reduce((sum, r) => sum + r.findings.length, 0),
    results,
    errors,
    exitCode: errors.length ? 2 : blocked ? 1 : 0,
  };
}

function main() {
  const args = process.argv.slice(2);
  let root = join(ROOT, "content");
  try {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--json") continue;
      if (args[i] === "--root" && args[i + 1] && !args[i + 1].startsWith("--")) {
        root = resolve(args[++i]);
        continue;
      }
      throw new Error(`Unknown or incomplete argument: ${args[i]}`);
    }
    const report = auditContent(root);
    if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
    else {
      for (const r of report.results.filter((r) => r.findings.length)) {
        console.log(`\n${r.blocked ? "BLOCKED" : "REVIEW"} ${r.file} (${r.severity})`);
        for (const f of r.findings)
          console.log(`  [${f.severity}] ${f.category} — ${f.pattern} (${f.field}@${f.offset})`);
      }
      for (const e of report.errors) console.error(`ERROR ${e.file}: ${e.error}`);
      console.log(
        `\nAudited ${report.scanned} packages: ${report.totalFindings} findings, ${report.blocked} blocked, ${report.failed} errors.`,
      );
      console.log(
        "No signals is not proof of safety. Referenced files and runtime behavior require separate review.",
      );
    }
    process.exitCode = report.exitCode;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
