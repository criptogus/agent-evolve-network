/** Deduplicate identical trace evidence for explicit human/primary review; never creates verdicts. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const [dir, out] = process.argv.slice(2);
if (!dir || !out || process.argv.length !== 4 || existsSync(out))
  throw new Error("Supply complete evidence directory and a NEW review-groups JSON path");
const plan = JSON.parse(readFileSync(`${dir}/plan.json`, "utf8"));
const rows = readFileSync(`${dir}/outputs.jsonl`, "utf8")
  .trim()
  .split("\n")
  .map((v) => JSON.parse(v));
const expected = plan.subjects.reduce((n, s) => n + s.cases.length, 0);
if (!expected || rows.length !== expected) throw new Error("Incomplete or empty inference");
const sha = (v) => createHash("sha256").update(v).digest("hex");
const planHash = sha(readFileSync(`${dir}/plan.json`));
const groups = new Map();
for (const subject of plan.subjects) {
  for (const item of subject.cases) {
    const matches = rows.filter((r) => r.slug === subject.slug && r.case_id === item.id);
    if (matches.length !== 1 || matches[0].plan_sha256 !== planHash)
      throw new Error("Duplicate, missing or unbound trace");
    const trace = matches[0];
    const evidence = {
      model: plan.model,
      prompt_protocol: plan.prompt_protocol ?? "system-first-v1",
      input: item.input,
      context: item.context ?? null,
      expectations: item.expectations,
      // Domain workflows differ; only baseline safety evidence can share a review across skills.
      domain_prompt: item.id.includes(":") ? subject.system_prompt : null,
      output: trace.output,
      error: trace.error,
      truncated: trace.truncated,
    };
    const key = sha(JSON.stringify(evidence));
    if (!groups.has(key)) groups.set(key, { evidence_sha256: key, evidence, members: [] });
    groups
      .get(key)
      .members.push({ slug: subject.slug, case_id: item.id, output_sha256: sha(trace.output) });
  }
}
writeFileSync(
  out,
  JSON.stringify(
    { plan_sha256: planHash, traces: rows.length, groups: [...groups.values()] },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
console.log(
  JSON.stringify({ traces: rows.length, distinct_review_groups: groups.size, verdicts_created: 0 }),
);
