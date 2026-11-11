// Marketplace package audit — the single implementation shared by the
// BLOCKING CI gate (scripts/audit-skills.ts) and the MCP `security_scan` tool.
//
// Two layers:
//   1. Prompt-injection / jailbreak signals, via the production runtime guard
//      (src/lib/security/prompt-injection-guard.ts) so gate and runtime never
//      drift, plus SkillSpector-derived golden patterns.
//   2. Malicious "functions" — shell/network primitives embedded in a skill's
//      instructions (RCE, exfiltration, unreviewable bytecode, …).
//
// Extracted from the script so runtime callers never import from scripts/.

import {
  inspectContent,
  type InjectionFinding,
  type InjectionSeverity,
} from "./prompt-injection-guard.ts";

export type AuditSeverity = InjectionSeverity;
export type AuditCategory = InjectionFinding["category"] | "malicious_function";

export interface AuditFinding {
  pattern: string;
  category: AuditCategory;
  severity: AuditSeverity;
  excerpt: string;
  offset: number;
  /** Package field the finding was found in (description, system_prompt, …). */
  field?: string;
}

export interface AuditResult {
  /** Worst severity found across all scanned fields. */
  severity: AuditSeverity;
  /** True when severity >= rejectAt (the CI gate's BLOCK state). */
  blocked: boolean;
  findings: AuditFinding[];
}

export interface PackageAuditOptions {
  /** At or above this severity the package is BLOCKED. Default: "high". */
  rejectAt?: AuditSeverity;
}

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const worse = (a: AuditSeverity, b: AuditSeverity): AuditSeverity =>
  SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;

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

interface CodeRule {
  label: string;
  category: AuditCategory;
  severity: AuditSeverity;
  re: RegExp;
}

// Malicious-function heuristics layered on top of the prompt-injection guard.
// High precision, ordered most-dangerous first.
const CODE_RULES: CodeRule[] = [
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
  // Golden pattern SC9 (NVIDIA SkillSpector): pre-compiled Python bytecode —
  // source you can't review, ready to run.
  {
    label: "execute compiled python bytecode (.pyc/.pyo — unreviewable source)",
    category: "malicious_function",
    severity: "high",
    re: /\b(python|py|run|execute)\b[^\n]{0,40}\.(pyc|pyo)\b/gi,
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
const DEMOTE_IN_EXAMPLES = new Set<string>([
  "instruction_override",
  "role_hijack",
  "system_prompt_leak",
  "policy_bypass",
  "encoding_evasion",
  "memory_poisoning",
]);
const DEMOTE: Record<AuditSeverity, AuditSeverity> = {
  critical: "medium",
  high: "low",
  medium: "low",
  low: "none",
  none: "none",
};

function urlHost(u: string): string {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return "";
  }
}

// Demote an "outbound request" finding to low if it only targets an
// allowlisted host (docs links etc.), to keep false positives down.
function effectiveSeverity(rule: CodeRule, matchText: string): AuditSeverity {
  if (rule.label.startsWith("outbound request")) {
    const url = matchText.match(/https?:\/\/[^\s'"`)]+/);
    if (url) {
      const host = urlHost(url[0]);
      if (ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "low";
    }
  }
  return rule.severity;
}

function scanCode(text: string): { findings: AuditFinding[]; severity: AuditSeverity } {
  const findings: AuditFinding[] = [];
  let max: AuditSeverity = "none";
  for (const rule of CODE_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
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

export const AUDITED_FIELDS = [
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
] as const;

function harvestFields(pkg: Record<string, unknown>): Record<string, string> {
  const flatten = (v: unknown, acc: string[]): string[] => {
    if (typeof v === "string") acc.push(v);
    else if (Array.isArray(v)) v.forEach((x) => flatten(x, acc));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => flatten(x, acc));
    return acc;
  };
  const fields: Record<string, string> = {};
  for (const k of AUDITED_FIELDS) {
    const value = pkg[k];
    if (value == null) continue;
    let text = flatten(value, []).join("\n");
    for (const re of BENIGN_BOILERPLATE) text = text.replace(re, " ");
    fields[k] = text;
  }
  return fields;
}

/**
 * Audit a single parsed package object. Pure: no I/O, no YAML parsing — the
 * caller parses, the gate decides. Shared by the CI gate and the MCP
 * `security_scan` tool so a package can never be "clean" in one and dirty in
 * the other.
 */
export function auditPackage(
  pkg: Record<string, unknown>,
  options: PackageAuditOptions = {},
): AuditResult {
  const fields = harvestFields(pkg);
  const tags = Array.isArray(pkg.tags) ? pkg.tags.map((t) => String(t).toLowerCase()) : [];
  const isFixture = tags.some((t) => SECURITY_FIXTURE_TAGS.has(t));
  const findings: AuditFinding[] = [];
  let severity: AuditSeverity = "none";
  for (const [field, text] of Object.entries(fields)) {
    const inj = inspectContent(text, { fence: false, rejectAtOrAbove: "critical" });
    const code = scanCode(text);
    for (const f of [...inj.findings, ...code.findings]) {
      let sev = f.severity;
      if (
        isFixture &&
        (field === "examples" || field === "description" || field === "long_description") &&
        DEMOTE_IN_EXAMPLES.has(f.category)
      ) {
        sev = DEMOTE[sev];
      }
      if (sev === "none") continue;
      findings.push({ ...f, severity: sev, field });
      severity = worse(severity, sev);
    }
  }
  const rejectAt = options.rejectAt ?? "high";
  const blocked = SEVERITY_RANK[severity] >= SEVERITY_RANK[rejectAt];
  return { severity, blocked, findings };
}
