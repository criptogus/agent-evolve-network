/** Diagnostic only: replay preserved finance receipts and original literal requirements. No model calls or approvals. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parse } from "yaml";
import { evaluateCase } from "../src/lib/adversarial/scorer.ts";
import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
} from "../src/lib/runtime/finance-source-facts.ts";
import { prepareFinanceStage } from "../src/lib/runtime/finance-stages.ts";
import {
  prepareSupplierFacts,
  validateSupplierResponse,
  composeSupplierFacts,
} from "../src/lib/runtime/supplier-source-facts.ts";
import { prepareSupplierStage } from "../src/lib/runtime/supplier-stages.ts";
const [dir, output] = process.argv.slice(2);
if (process.argv.length !== 4 || !dir || !output || existsSync(output))
  throw new Error("Supply EVIDENCE_DIR NEW_REPORT; reports are never overwritten");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const load = (path) => JSON.parse(readFileSync(path, "utf8"));
const { planHash, ...plan } = load(join(dir, "plan.json"));
if (hash(JSON.stringify(plan)) !== planHash) throw new Error("Changed plan");
const contractPath = "content/expansion/playbook-adversarial-cases.json";
const contractHash = "c8361a94d98c18577812e003524b57e2ef25ff7a68cd450c4c7f59a28b3fc63a";
if (
  hash(readFileSync(contractPath)) !== contractHash ||
  plan.sourceHashes[contractPath] !== contractHash
)
  throw new Error("Changed original contract");
const contract = load(contractPath);
if (JSON.stringify(plan.thresholds) !== JSON.stringify(contract.thresholds))
  throw new Error("Changed original thresholds");
if (
  plan.subjects.length !== 4 ||
  plan.subjects.some(
    (s, i) =>
      s.slug !== contract.subjects[i].slug ||
      JSON.stringify(s.cases) !== JSON.stringify(contract.subjects[i].cases),
  )
)
  throw new Error("Changed subjects/cases");
for (const path of [
  "src/lib/runtime/finance-source-facts.ts",
  "src/lib/runtime/finance-stages.ts",
  "src/lib/adversarial/scorer.ts",
  "src/lib/runtime/supplier-source-facts.ts",
  "src/lib/runtime/supplier-stages.ts",
])
  if (hash(readFileSync(path)) !== plan.sourceHashes[path])
    throw new Error("Current diagnostic runtime differs from frozen evidence");
const raw = readFileSync(join(dir, "outputs.jsonl"), "utf8").trim();
if (!raw) throw new Error("Empty evidence cannot succeed");
const seen = new Set();
const results = raw.split("\n").map((line) => {
  const row = JSON.parse(line),
    subject = plan.subjects.find((s) => s.slug === row.slug),
    c = subject?.cases.find((c) => c.id === row.case_id);
  if (
    !c ||
    seen.has(c.id) ||
    row.planHash !== planHash ||
    row.version !== subject.version ||
    row.package_sha256 !== subject.artifact.sha256
  )
    throw new Error("Unbound, duplicate or substituted case");
  seen.add(c.id);
  const run = JSON.parse(row.stdout);
  const workflowPath = `content/playbooks/${subject.slug}.yaml`;
  if (hash(readFileSync(workflowPath)) !== plan.sourceHashes[workflowPath])
    throw new Error("Changed workflow source");
  const workflow = parse(readFileSync(workflowPath, "utf8"));
  if (
    row.exitCode !== 0 ||
    row.output_error ||
    run.status !== "ok" ||
    JSON.stringify(run.step_outcomes?.map((step) => step.step_id)) !==
      JSON.stringify(workflow.steps.map((step) => step.id))
  )
    throw new Error("Incomplete/error graph");
  let financeReceipts = false;
  if (subject.slug === "solution-monthly-finance-close") {
    if (
      JSON.stringify(run.step_outcomes.map((s) => s.step_id)) !==
      JSON.stringify(["extract", "reconcile", "analyze", "approve"])
    )
      throw new Error("Changed finance stage sequence");
    const evidence = run.source_facts,
      prepared = prepareFinanceFacts(c.inputs);
    const response = validateFinanceResponse(JSON.parse(evidence.raw_response), prepared);
    if (
      JSON.stringify(evidence.request) !== JSON.stringify(prepared.request) ||
      JSON.stringify(response) !== JSON.stringify(evidence.response) ||
      JSON.stringify(composeFinanceFacts(prepared, response)) !== JSON.stringify(evidence.facts)
    )
      throw new Error("Changed provider source evidence");
    const previous = {};
    for (const step of run.step_outcomes) {
      const expected = prepareFinanceStage(`finance.${step.step_id}`, evidence, previous);
      if (
        step.status !== "ok" ||
        step.attempts !== 1 ||
        JSON.stringify(step.output) !== JSON.stringify(expected) ||
        JSON.stringify(run.outputs[step.step_id]) !== JSON.stringify(expected)
      )
        throw new Error("Changed finance stage output");
      previous[step.step_id] = { output: expected, status: "ok" };
    }
    financeReceipts = true;
  }
  let supplierFacts = false;
  if (subject.slug === "solution-supplier-selection") {
    const evidence = run.source_facts,
      prepared = prepareSupplierFacts(c.inputs);
    const response = validateSupplierResponse(JSON.parse(evidence.raw_response), prepared);
    if (
      JSON.stringify(evidence.request) !== JSON.stringify(prepared.request) ||
      JSON.stringify(response) !== JSON.stringify(evidence.response) ||
      JSON.stringify(composeSupplierFacts(prepared, response)) !== JSON.stringify(evidence.facts)
    )
      throw new Error("Changed supplier provider evidence");
    const previous = {};
    for (const step of run.step_outcomes) {
      const expected = prepareSupplierStage(`supplier.${step.step_id}`, evidence, previous);
      if (
        step.status !== "ok" ||
        step.attempts !== 1 ||
        JSON.stringify(step.output) !== JSON.stringify(expected) ||
        JSON.stringify(run.outputs[step.step_id]) !== JSON.stringify(expected)
      )
        throw new Error("Changed supplier stage output");
      previous[step.step_id] = { output: expected, status: "ok" };
    }
    supplierFacts = true;
  }
  const text = run.step_outcomes
    .map((s) => (typeof s.output === "string" ? s.output : s.output.body))
    .join("\n");
  return {
    case_id: c.id,
    output_sha256: hash(line),
    finance_receipts_recomputed: financeReceipts,
    supplier_facts_and_stages_recomputed: supplierFacts,
    generative_transport_qualification: "requires complete strict reporter, not this diagnostic",
    literal: c.original_case ? evaluateCase(c.original_case, text) : null,
  };
});
const report = {
  status: "diagnostic_not_qualification",
  planHash,
  recorded_cases: results.length,
  scheduled_cases: 72,
  literal_failures: results.filter((r) => r.literal && !r.literal.passed).length,
  primary_review: "not performed by this command",
  model_calls: 0,
  production_writes: 0,
  publicationApproved: false,
  results,
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    recorded_cases: results.length,
    literal_failures: report.literal_failures,
    publicationApproved: false,
  }),
);
process.exitCode = report.literal_failures ? 2 : 4;
