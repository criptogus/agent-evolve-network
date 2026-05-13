#!/usr/bin/env node
// Builds a JSONL fine-tune dataset for a vertical Soul by joining its persona
// rules with consented historical executions. Output:
//   { messages: [{ role: "system", content: persona }, { role: "user", ... }, { role: "assistant", ... }] }
//
// Usage:
//   node scripts/build-soul-finetune-dataset.mjs --soul fintech-compliance --out dataset.jsonl
//   Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY when --source=db (default --source=examples).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const args = parse(process.argv.slice(2));
if (!args.soul || !args.out) {
  console.error("Usage: --soul <slug> --out <file.jsonl> [--source examples|db]");
  process.exit(1);
}
const ROOT = new URL("..", import.meta.url).pathname;
const soul = parseYaml(readFileSync(join(ROOT, `content/souls/${args.soul}.yaml`), "utf8"));

const lines = [];
const system = `${soul.persona}\n\nValues:\n- ${soul.values.join("\n- ")}\n\nDo say:\n- ${(soul.do_say||[]).join("\n- ")}\n\nDo not say:\n- ${(soul.dont_say||[]).join("\n- ")}`;

const source = args.source ?? "examples";
if (source === "examples") {
  // Pair the soul with each adversarial case targeting its tags to produce
  // (instruction, expected-style refusal/answer) pairs seeded from the harness.
  const advRoot = join(ROOT, "content/adversarial");
  for (const v of readdirSafe(advRoot)) {
    for (const f of readdirSafe(join(advRoot, v))) {
      if (!/\.ya?ml$/i.test(f) || f.startsWith("_")) continue;
      const kase = parseYaml(readFileSync(join(advRoot, v, f), "utf8"));
      const tagOverlap = (kase.tags ?? []).some((t) => (soul.tags ?? []).includes(t));
      if (!tagOverlap && v !== inferVertical(soul.tags ?? [])) continue;
      const expected = synthesizeExpected(kase, soul);
      lines.push(JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: kase.input },
          { role: "assistant", content: expected },
        ],
        meta: { source: "adversarial", case_id: kase.id, severity: kase.severity },
      }));
    }
  }
} else {
  console.error("--source=db not implemented in this stub; use the data team's pipeline.");
  process.exit(2);
}

writeFileSync(args.out, lines.join("\n") + "\n");
console.error(`Wrote ${lines.length} examples to ${args.out}`);

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2), n = argv[i + 1];
    if (!n || n.startsWith("--")) o[k] = true; else { o[k] = n; i++; }
  }
  return o;
}
function readdirSafe(p) { try { return readdirSync(p); } catch { return []; } }
function readdirSync(p) { return require("node:fs").readdirSync(p); }
function inferVertical(tags) {
  if (tags.includes("hipaa") || tags.includes("healthcare")) return "healthcare";
  if (tags.includes("fintech") || tags.includes("compliance")) return "fintech";
  if (tags.includes("sre") || tags.includes("kubernetes") || tags.includes("devops")) return "devops";
  if (tags.includes("soc2") || tags.includes("audit") || tags.includes("security")) return "security";
  return "general";
}
function synthesizeExpected(kase, soul) {
  const exp = kase.expectations.must_refuse_or_must_include;
  const lead = exp.must_refuse
    ? `I can't comply with that request. ${exp.rationale ?? ""}`.trim()
    : "";
  const includes = (exp.must_include ?? []).map((s) => `Note: ${s}.`).join(" ");
  const tone = soul.tone ? `[tone: ${soul.tone}]` : "";
  return [tone, lead, includes].filter(Boolean).join("\n").trim();
}
