// MCP `security_scan` tool — the scanner as a RUNTIME guardrail, not only a
// CI gate (NVIDIA SkillSpector exposes the same capability inside the agent
// session; an agent about to install a package can ask before trusting it).
//
// The scan is the SAME implementation the blocking CI gate uses
// (src/lib/security/package-audit.ts), so "clean" here can never contradict
// "clean" at publish time. Read-only, anonymous, no quota — safety should not
// be paywalled.

import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import { auditPackage, type AuditResult } from "@/lib/security/package-audit";

const json = (v: unknown) => JSON.stringify(v, null, 2);

const SEVERITY_ORDER = ["none", "low", "medium", "high", "critical"] as const;

function verdictFor(result: AuditResult): "SAFE" | "CAUTION" | "DO_NOT_INSTALL" {
  if (result.blocked) return "DO_NOT_INSTALL";
  return result.findings.length > 0 ? "CAUTION" : "SAFE";
}

export const securityScanTool = defineTool({
  name: "security_scan",
  description:
    "Scan a skill/playbook/soul/guardrail manifest BEFORE installing it. Runs the SAME blocking gate the marketplace uses at publish time: prompt-injection and jailbreak patterns (including NVIDIA SkillSpector golden patterns — hidden unicode-tag instructions, memory poisoning, anti-refusal overrides, tool parameter-description smuggling), malicious functions (RCE, exfiltration beacons, unreviewable .pyc bytecode) and obfuscated payloads. Returns safe_to_install + per-finding evidence (field, offset, excerpt) so the host agent can explain WHY. Read-only, free, anonymous. An empty finding list means 'nothing the current pattern set detects' — not a mathematical proof of safety.",
  parameters: z.object({
    content: z
      .string()
      .min(1)
      .describe(
        "Raw package file content (YAML or JSON). Read the file from the user's repo and pass it verbatim — do not summarise it.",
      ),
    reject_at: z
      .enum(SEVERITY_ORDER)
      .optional()
      .describe(
        "Severity at or above which safe_to_install becomes false. Default: high — the same threshold the CI gate blocks on.",
      ),
    max_findings: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Cap on returned findings (default 25). The severity/verdict always reflect ALL findings.",
      ),
  }),
  execute: async ({ content, reject_at, max_findings }) => {
    let pkg: Record<string, unknown> | null;
    try {
      pkg = parseYaml(content);
    } catch (error) {
      return json({
        safe_to_install: false,
        verdict: "DO_NOT_INSTALL",
        error: "content is not valid YAML/JSON",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
      return json({
        safe_to_install: false,
        verdict: "DO_NOT_INSTALL",
        error: "content must be a single YAML/JSON mapping (a package manifest)",
      });
    }

    const result = auditPackage(pkg, { rejectAt: reject_at ?? "high" });
    const findings = result.findings
      .slice()
      .sort((a, b) => SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity));
    const shown = findings.slice(0, max_findings ?? 25);

    return json({
      safe_to_install: verdictFor(result) !== "DO_NOT_INSTALL",
      verdict: verdictFor(result),
      slug: typeof pkg.slug === "string" ? pkg.slug : null,
      version: typeof pkg.version === "string" ? pkg.version : null,
      worst_severity: result.severity,
      reject_at: reject_at ?? "high",
      finding_count: findings.length,
      findings: shown.map((f) => ({
        severity: f.severity,
        category: f.category,
        pattern: f.pattern,
        field: f.field,
        offset: f.offset,
        excerpt: f.excerpt,
      })),
      omitted_findings: Math.max(0, findings.length - shown.length),
      analysis_scope: {
        gate: "src/lib/security/package-audit.ts — identical to the blocking CI `audit:skills` gate",
        known_limitations: [
          "Pattern-based: a package with no finding is 'nothing detected', not 'proven safe'.",
          "Does not execute the package; runtime behaviour of bundled code is out of scope.",
          "Declared security/red-team fixtures have quoted attack strings inside `examples` demoted, matching the publish gate.",
        ],
        next_step:
          "If the verdict is CAUTION or DO_NOT_INSTALL, show the findings to the user and do not install without an explicit decision. If SAFE, install and then report_execution so the trust score learns from real runs.",
      },
    });
  },
});
