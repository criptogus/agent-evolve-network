#!/usr/bin/env node
// Paired benchmark: run the SAME adversarial suite against a certified package
// and against its uncertified baseline prompt (content/benchmark/baselines/),
// then report per-attack-class pass rates with Wilson 95% lower bounds.
// This is the run that makes the landing-page "ungraded vs SAK A-grade"
// comparison true and reproducible.
//
// Usage:
//   node --experimental-strip-types scripts/benchmark-paired.mjs --skill code-reviewer --mock
//   node --experimental-strip-types scripts/benchmark-paired.mjs --skill code-reviewer --out benchmark.json
//
// Without --mock, requires AI_GATEWAY_BASE_URL / AI_GATEWAY_API_KEY in env.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
// Pure modules only (no-extension internal imports in runner.ts don't resolve
// under plain node) — case loading is done inline, same as eval-adversarial.mjs.
const { evaluateCase, summarize } = await import("../src/lib/adversarial/scorer.ts");
const { pairedComparison, BENCHMARK_METHODOLOGY_VERSION } =
  await import("../src/lib/benchmark/paired.ts");

async function runSuite(cases, systemPrompt, invoke) {
  const outcomes = [];
  for (const kase of cases) {
    let output;
    try {
      output = await invoke({
        system_prompt: systemPrompt,
        user_input: kase.input,
        context: kase.context,
      });
    } catch (err) {
      output = `__invocation_error__: ${err.message}`;
    }
    outcomes.push(evaluateCase(kase, output));
  }
  return summarize(outcomes);
}

function loadCases({ vertical, packageSlug, tags }) {
  const advRoot = join(ROOT, "content/adversarial");
  const out = [];
  for (const v of readdirSync(advRoot)) {
    if (vertical && v !== vertical) continue;
    const dir = join(advRoot, v);
    if (!statSync(dir).isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
      const kase = parseYaml(readFileSync(join(dir, entry), "utf8"));
      if (!kase || kase.type !== "adversarial_case") continue;
      if (kase.target.package_type !== "skill") continue;
      const slugs = kase.target.package_slugs ?? [];
      const caseTags = kase.target.tags ?? [];
      const slugMatch = slugs.length === 0 || slugs.includes(packageSlug);
      const tagMatch = caseTags.length === 0 || caseTags.some((t) => tags.includes(t));
      if (slugs.length === 0 && caseTags.length === 0) out.push(kase);
      else if (slugMatch || tagMatch) out.push(kase);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.skill) {
  console.error("Usage: --skill <slug> [--vertical X] [--mock] [--out file.json]");
  process.exit(1);
}

const pkgPath = join(ROOT, `content/skills/${args.skill}.yaml`);
const basePath = join(ROOT, `content/benchmark/baselines/${args.skill}.yaml`);
if (!existsSync(basePath)) {
  console.error(
    `No baseline for "${args.skill}". Add content/benchmark/baselines/${args.skill}.yaml ` +
      `(see content/benchmark/README.md) — a paired benchmark without a baseline is not a benchmark.`,
  );
  process.exit(2);
}
const pkg = parseYaml(readFileSync(pkgPath, "utf8"));
const baseline = parseYaml(readFileSync(basePath, "utf8"));
if (baseline.type !== "benchmark_baseline" || baseline.pairs_with !== args.skill) {
  console.error(
    `Baseline file is invalid: type must be benchmark_baseline and pairs_with must be "${args.skill}".`,
  );
  process.exit(2);
}

const cases = loadCases({ vertical: args.vertical, packageSlug: args.skill, tags: pkg.tags ?? [] });
if (cases.length === 0) {
  console.error("No adversarial cases match this package.");
  process.exit(2);
}

const invoke = args.mock ? null : await buildGatewayInvoker();

// In --mock mode the two arms use deterministic invokers so the pipeline can
// be smoke-tested offline: the certified arm refuses attacks, the baseline
// arm naively complies. Mock output is CLEARLY labeled and must never be
// published — it exercises the plumbing, not the claim.
const certifiedReport = await runSuite(
  cases,
  pkg.system_prompt,
  invoke ??
    (({ user_input }) =>
      Promise.resolve(
        `I can't comply with that request — it violates policy. (len ${user_input.length})`,
      )),
);
const baselineReport = await runSuite(
  cases,
  baseline.system_prompt,
  invoke ??
    (({ user_input }) =>
      Promise.resolve(`Sure! Here is exactly what you asked for: ${user_input.slice(0, 200)}`)),
);

const comparison = pairedComparison(baselineReport, certifiedReport);
const result = {
  methodology: BENCHMARK_METHODOLOGY_VERSION,
  mode: args.mock ? "mock" : "live",
  generated_note: args.mock
    ? "MOCK RUN — plumbing smoke test only; never publish these numbers"
    : "live gateway run",
  package: { slug: args.skill, version: pkg.version },
  baseline: { file: `content/benchmark/baselines/${args.skill}.yaml`, name: baseline.name },
  comparison,
};

if (args.out) {
  writeFileSync(args.out, JSON.stringify(result, null, 2));
  console.log(`Wrote ${args.out}`);
}

console.log(`\nPaired adversarial benchmark — ${args.skill}@${pkg.version} [${result.mode}]`);
console.log(`Suite: ${comparison.total_cases} cases (identical for both arms)\n`);
console.log(pad("Attack class", 20) + pad("Baseline", 18) + pad("SAK certified", 18) + "Uplift");
for (const row of comparison.rows) {
  if (row.baseline.total === 0) continue;
  console.log(
    pad(row.label, 20) +
      pad(fmt(row.baseline), 18) +
      pad(fmt(row.certified), 18) +
      `${(row.uplift * 100).toFixed(1)} pp`,
  );
}
console.log(
  `\nSeverity-weighted: baseline ${(comparison.baseline_weighted_score * 100).toFixed(1)}% · ` +
    `certified ${(comparison.certified_weighted_score * 100).toFixed(1)}%`,
);
console.log(`Publishable number per class = the Wilson lower bound ("≥ X%"), never the raw rate.`);

function fmt(s) {
  return s.total === 0
    ? "—"
    : `${(s.rate * 100).toFixed(1)}% (≥${(s.lower_bound * 100).toFixed(1)}%)`;
}
function pad(s, n) {
  return String(s).padEnd(n);
}
function parseArgs(argv) {
  const out = {};
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
async function buildGatewayInvoker() {
  const {
    AI_GATEWAY_BASE_URL,
    AI_GATEWAY_API_KEY,
    AI_GATEWAY_MODEL = "openai/gpt-4o-mini",
  } = process.env;
  if (!AI_GATEWAY_BASE_URL || !AI_GATEWAY_API_KEY) {
    console.error("AI_GATEWAY_BASE_URL and AI_GATEWAY_API_KEY required (or pass --mock).");
    process.exit(1);
  }
  return async ({ system_prompt, user_input, context }) => {
    const messages = [{ role: "system", content: system_prompt }];
    if (context) messages.push({ role: "user", content: `Context:\n${context}` });
    messages.push({ role: "user", content: user_input });
    const res = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({ model: AI_GATEWAY_MODEL, messages, temperature: 0 }),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  };
}
