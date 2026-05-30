#!/usr/bin/env node
// Complementary skill security scan powered by NVIDIA SkillSpector.
//
// This is a SECOND, independent opinion layered on top of the curated
// `audit:skills` gate (scripts/audit-skills.mjs). Where audit:skills is a
// high-precision, schema-aware gate tuned to this marketplace, SkillSpector
// brings NVIDIA's broader catalogue of vulnerability patterns (prompt
// injection, data exfiltration, privilege escalation, supply-chain, excessive
// agency, MCP tool poisoning, …) plus AST/YARA behavioural detection.
//
// Marketplace packages are stored as structured YAML, but SkillSpector expects
// a skill *directory* (a SKILL.md plus any scripts). So for each package we
// render every LLM-readable field into a throwaway SKILL.md and scan that.
//
// SkillSpector is an OPTIONAL, external tool (Python 3.12+, installed from
// https://github.com/NVIDIA/skillspector). When it is not on PATH this script
// skips gracefully with exit 0 so local installs and unrelated CI stay green —
// unless SKILLSPECTOR_REQUIRED=1 (or --require) is set.
//
// Usage:
//   node scripts/scan-skillspector.mjs                # scan all packages (advisory)
//   node scripts/scan-skillspector.mjs content/skills/foo.yaml ...   # scan specific files
//   node scripts/scan-skillspector.mjs --block        # non-zero exit when a package is risky
//   node scripts/scan-skillspector.mjs --sarif report.sarif          # write merged SARIF
//   node scripts/scan-skillspector.mjs --json         # machine-readable summary on stdout
//
// Env:
//   SKILLSPECTOR_BIN        path to the skillspector executable (default: "skillspector")
//   SKILLSPECTOR_THRESHOLD  risk score (0-100) at/above which a package is "risky" (default: 50)
//   SKILLSPECTOR_REQUIRED   "1" to fail when the tool is missing instead of skipping
//   SKILLSPECTOR_LLM        "1" to enable LLM semantic analysis (needs a provider key); default static-only

import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  statSync,
  rmSync,
} from "node:fs";
import { join, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const FOLDERS = ["skills", "playbooks", "souls", "integrations"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BLOCK = flag("--block") || process.env.SKILLSPECTOR_BLOCK === "1";
const JSON_OUT = flag("--json");
const REQUIRED = flag("--require") || process.env.SKILLSPECTOR_REQUIRED === "1";
const USE_LLM = process.env.SKILLSPECTOR_LLM === "1";
const SARIF_OUT = opt("--sarif", null);
const THRESHOLD = Number(process.env.SKILLSPECTOR_THRESHOLD || opt("--threshold", "50"));
const BIN = process.env.SKILLSPECTOR_BIN || "skillspector";

const SEVERITY_RANK = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
// SkillSpector severities → SARIF levels.
const SARIF_LEVEL = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
  none: "none",
};

const C = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

// --- resolve which YAML packages to scan ----------------------------------
function defaultTargets() {
  const out = [];
  for (const folder of FOLDERS) {
    const dir = join(ROOT, "content", folder);
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (!/\.ya?ml$/i.test(entry) || basename(entry).startsWith("_")) continue;
      if (statSync(full).isFile()) out.push(full);
    }
  }
  return out;
}

const explicit = args.filter((a) => !a.startsWith("--") && /\.ya?ml$/i.test(a));
// `--sarif <file>` / `--threshold <n>` consume the following token; drop those.
const consumed = new Set();
for (const o of ["--sarif", "--threshold"]) {
  const i = args.indexOf(o);
  if (i >= 0) consumed.add(args[i + 1]);
}
const targets = (explicit.length ? explicit.filter((a) => !consumed.has(a)) : defaultTargets())
  .map((p) => resolve(p))
  .filter((p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });

// --- check the tool is available ------------------------------------------
function toolAvailable() {
  const r = spawnSync(BIN, ["--version"], { encoding: "utf8" });
  return r.status === 0 || (r.stdout || r.stderr || "").toLowerCase().includes("skillspector");
}

if (!toolAvailable()) {
  const msg =
    `SkillSpector ('${BIN}') is not installed — skipping the complementary scan.\n` +
    `  Install: git clone https://github.com/NVIDIA/skillspector && cd skillspector && uv tool install --python 3.12 .\n` +
    `  (The curated 'npm run audit:skills' gate still runs independently.)`;
  if (REQUIRED) {
    console.error(`${C.red}✗${C.reset} ${msg}`);
    process.exit(2);
  }
  console.warn(`${C.yellow}⚠${C.reset}  ${msg}`);
  if (JSON_OUT)
    console.log(JSON.stringify({ skipped: true, reason: "skillspector-not-installed" }, null, 2));
  process.exit(0);
}

// --- render a package's readable fields into a throwaway SKILL.md ----------
function flatten(v, acc = []) {
  if (typeof v === "string") acc.push(v);
  else if (typeof v === "number" || typeof v === "boolean") acc.push(String(v));
  else if (Array.isArray(v)) v.forEach((x) => flatten(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => flatten(x, acc));
  return acc;
}

// Every field an agent would actually read at runtime, in a stable order.
const BODY_FIELDS = [
  "long_description",
  "system_prompt",
  "persona",
  "instructions",
  "steps",
  "rules",
  "examples",
  "body",
  "agent_footer",
];

function renderSkillMd(pkg) {
  const name = String(pkg.name ?? pkg.slug ?? "package").replace(/\n/g, " ");
  const description = String(pkg.description ?? "").replace(/\n/g, " ");
  const sections = [
    `---`,
    `name: ${JSON.stringify(name)}`,
    `description: ${JSON.stringify(description)}`,
    `---`,
    "",
  ];
  for (const field of BODY_FIELDS) {
    if (pkg[field] == null) continue;
    const text = flatten(pkg[field]).join("\n").trim();
    if (!text) continue;
    sections.push(`## ${field}`, "", text, "");
  }
  return sections.join("\n");
}

// --- run SkillSpector once per package ------------------------------------
function scanPackage(yamlPath, workdir) {
  let pkg;
  try {
    pkg = parseYaml(readFileSync(yamlPath, "utf8"));
  } catch (e) {
    return { yamlPath, error: `parse error: ${e.message}` };
  }
  if (!pkg || typeof pkg !== "object") return { yamlPath, error: "empty or non-object package" };

  const slug = String(pkg.slug ?? basename(yamlPath).replace(/\.ya?ml$/i, ""));
  const skillDir = join(workdir, slug);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), renderSkillMd(pkg), "utf8");

  const cliArgs = ["scan", skillDir, "--format", "json"];
  if (!USE_LLM) cliArgs.push("--no-llm");
  const r = spawnSync(BIN, cliArgs, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, SKILLSPECTOR_LOG_LEVEL: process.env.SKILLSPECTOR_LOG_LEVEL || "ERROR" },
  });

  // exit 2 = scanner error; exit 0/1 = scan completed (1 ⇒ score over the tool's own bar).
  if (r.status === 2 || !r.stdout) {
    return {
      yamlPath,
      slug,
      error: `scanner failed (exit ${r.status}): ${(r.stderr || "").trim().slice(0, 300)}`,
    };
  }
  let data;
  try {
    data = JSON.parse(r.stdout);
  } catch {
    return {
      yamlPath,
      slug,
      error: `could not parse scanner JSON: ${(r.stdout || "").slice(0, 200)}`,
    };
  }

  const ra = data.risk_assessment || {};
  return {
    yamlPath: yamlPath.replace(ROOT, ""),
    slug,
    score: Number(ra.score ?? 0),
    severity: String(ra.severity ?? "none").toLowerCase(),
    recommendation: ra.recommendation ?? "UNKNOWN",
    issues: Array.isArray(data.issues) ? data.issues : [],
  };
}

const workdir = mkdtempSync(join(tmpdir(), "skillspector-"));
const results = [];
let errors = 0;
try {
  for (const t of targets) {
    const res = scanPackage(t, workdir);
    if (res.error) {
      errors++;
      console.warn(`${C.yellow}⚠${C.reset}  ${res.slug || basename(t)}: ${res.error}`);
      continue;
    }
    results.push(res);
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

// --- merged SARIF for GitHub code scanning --------------------------------
function buildSarif(rows) {
  const ruleMap = new Map();
  const sarifResults = [];
  for (const row of rows) {
    for (const issue of row.issues) {
      const ruleId = String(issue.id || issue.pattern || issue.category || "skillspector");
      if (!ruleMap.has(ruleId)) {
        ruleMap.set(ruleId, {
          id: ruleId,
          name: String(issue.pattern || issue.category || ruleId).replace(/\s+/g, ""),
          shortDescription: { text: String(issue.pattern || issue.category || ruleId) },
          fullDescription: { text: String(issue.explanation || issue.pattern || ruleId) },
          properties: { category: issue.category, tags: ["security", "skillspector"] },
        });
      }
      const sev = String(issue.severity || "none").toLowerCase();
      sarifResults.push({
        ruleId,
        level: SARIF_LEVEL[sev] || "warning",
        message: {
          text: `[${row.slug}] ${issue.finding ? issue.finding + " — " : ""}${issue.explanation || issue.pattern || ruleId}`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: row.yamlPath.replace(/^\//, "") },
              region: { startLine: Number(issue?.location?.start_line) || 1 },
            },
          },
        ],
        properties: {
          slug: row.slug,
          confidence: issue.confidence,
          remediation: issue.remediation,
          renderedFrom: "SKILL.md (generated from YAML package)",
        },
      });
    }
  }
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "SkillSpector",
            informationUri: "https://github.com/NVIDIA/skillspector",
            rules: [...ruleMap.values()],
          },
        },
        results: sarifResults,
      },
    ],
  };
}

if (SARIF_OUT) {
  writeFileSync(resolve(SARIF_OUT), JSON.stringify(buildSarif(results), null, 2), "utf8");
}

// --- report ---------------------------------------------------------------
const risky = results.filter((r) => r.score >= THRESHOLD).sort((a, b) => b.score - a.score);
const withIssues = results.filter((r) => r.issues.length).sort((a, b) => b.score - a.score);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        threshold: THRESHOLD,
        scanned: results.length,
        errors,
        risky: risky.length,
        results: withIssues,
      },
      null,
      2,
    ),
  );
} else {
  if (!withIssues.length) {
    console.log(
      `${C.green}✓${C.reset} SkillSpector: no issues across ${results.length} package(s).`,
    );
  }
  for (const r of withIssues) {
    const col = r.score >= THRESHOLD ? C.red : C.yellow;
    const tag = r.score >= THRESHOLD ? "RISKY" : "WARN";
    console.log(
      `\n${col}${tag}${C.reset} ${r.yamlPath} ${C.dim}(score ${r.score}/100 · ${r.severity} · ${r.recommendation})${C.reset}`,
    );
    for (const issue of r.issues.sort(
      (a, b) =>
        (SEVERITY_RANK[String(b.severity).toLowerCase()] || 0) -
        (SEVERITY_RANK[String(a.severity).toLowerCase()] || 0),
    )) {
      const sev = String(issue.severity || "none").toLowerCase();
      const c = (SEVERITY_RANK[sev] || 0) >= 3 ? C.red : C.yellow;
      console.log(
        `  ${c}[${sev}]${C.reset} ${issue.category} — ${issue.pattern} ${C.dim}(${issue?.location?.file}:${issue?.location?.start_line ?? "?"})${C.reset}`,
      );
      if (issue.explanation)
        console.log(`    ${C.dim}${String(issue.explanation).slice(0, 160)}${C.reset}`);
    }
  }
  console.log(
    `\nSkillSpector scanned ${results.length} package(s)` +
      `${errors ? `, ${errors} scan error(s)` : ""} — ` +
      `${risky.length} at/above risk threshold ${THRESHOLD}.` +
      (SARIF_OUT ? ` SARIF → ${SARIF_OUT}.` : "") +
      (BLOCK ? "" : `  ${C.dim}(advisory; pass --block to fail the build)${C.reset}`),
  );
}

const shouldFail = (BLOCK && risky.length > 0) || (REQUIRED && errors > 0);
process.exit(shouldFail ? 1 : 0);
