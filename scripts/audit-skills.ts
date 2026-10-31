#!/usr/bin/env node
// Marketplace security audit gate — CLI around src/lib/security/package-audit.
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
// The SAME implementation backs the MCP `security_scan` tool; the logic lives
// in src/lib/security/package-audit.ts, this file is only the file-walking CLI.
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
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  auditPackage,
  type AuditFinding,
  type AuditSeverity,
} from "../src/lib/security/package-audit.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const FOLDERS = ["skills", "playbooks", "souls", "integrations"];
const REJECT_AT = (process.env.AUDIT_REJECT_AT || "high") as AuditSeverity;
const JSON_OUT = process.argv.includes("--json");

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function main() {
  const results: {
    file: string;
    slug: string;
    severity: AuditSeverity;
    blocked: boolean;
    findings: AuditFinding[];
  }[] = [];
  let blocked = 0;
  let totalFindings = 0;

  for (const folder of FOLDERS) {
    const dir = join(ROOT, "content", folder);
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (!statSync(full).isFile() || !/\.ya?ml$/i.test(entry)) continue;
      if (basename(entry).startsWith("_")) continue;

      let pkg: Record<string, unknown>;
      try {
        pkg = parseYaml(readFileSync(full, "utf8"));
      } catch {
        continue;
      }
      if (!pkg) continue;

      const { severity, blocked: reject, findings } = auditPackage(pkg, { rejectAt: REJECT_AT });
      if (reject) blocked++;
      totalFindings += findings.length;

      if (findings.length) {
        results.push({
          file: full.replace(ROOT, ""),
          slug: typeof pkg.slug === "string" ? pkg.slug : basename(entry),
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
    const C = { red: "\x1b[31m", yellow: "\x1b[33m", green: "\x1b[32m", dim: "\x1b[2m", reset: "\x1b[0m" };
    if (!results.length) {
      console.log(
        `${C.green}✓${C.reset} No malicious or injection signals in any marketplace package.`,
      );
    }
    for (const r of results.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])) {
      const tag = r.blocked ? `${C.red}BLOCKED${C.reset}` : `${C.yellow}WARN${C.reset}`;
      console.log(`\n${tag} ${r.file} ${C.dim}(worst: ${r.severity})${C.reset}`);
      for (const f of r.findings) {
        const col = SEVERITY_RANK[f.severity] >= 3 ? C.red : C.yellow;
        console.log(
          `  ${col}[${f.severity}]${C.reset} ${f.category} — ${f.pattern} ${C.dim}(${f.field})${C.reset}`,
        );
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
