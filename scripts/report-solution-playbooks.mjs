/** Fail-closed report for the separately frozen four-graph contract. Never writes registry/publication state. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parse } from "yaml";
import { verifySolutionPlaybookSnapshot } from "./solution-artifact-files.ts";
import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
  FINANCE_FACTS_MODEL,
} from "../src/lib/runtime/finance-source-facts.ts";
import { prepareFinanceStage } from "../src/lib/runtime/finance-stages.ts";
import { buildGatewayMessages } from "../src/lib/runtime/gateway-messages.ts";
import { evaluateCase } from "../src/lib/adversarial/scorer.ts";
import { eligibleForPublication } from "./adversarial-approval.mjs";
import {
  prepareSupplierFacts,
  validateSupplierResponse,
  composeSupplierFacts,
} from "../src/lib/runtime/supplier-source-facts.ts";
const [dir, reviewsPath, output] = process.argv.slice(2);
if (!dir || !reviewsPath || !output || process.argv.length !== 5 || existsSync(output))
  throw new Error("Supply EVIDENCE_DIR PRIMARY_REVIEWS NEW_REPORT; existing reports are preserved");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const lines = (p) =>
  readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .map((line) => ({ raw: line, value: JSON.parse(line) }));
const { planHash, ...plan } = read(join(dir, "plan.json"));
if (hash(JSON.stringify(plan)) !== planHash) throw new Error("Changed plan");
const contractPath = "content/expansion/playbook-adversarial-cases.json";
const contractHash = "c8361a94d98c18577812e003524b57e2ef25ff7a68cd450c4c7f59a28b3fc63a";
if (
  hash(readFileSync(contractPath)) !== contractHash ||
  plan.sourceHashes[contractPath] !== contractHash
)
  throw new Error("Changed pinned case contract");
const contract = read(contractPath);
const profile = read("content/expansion/playbook-model-profiles.json").find(
  (p) => p.model === plan.model,
);
if (!profile) throw new Error("Unsupported exact model/runtime profile");
const financeHost = read("content/expansion/playbook-local-contract.json").finance_host;
const supplierInterpreter = read(
  "content/expansion/playbook-local-contract.json",
).supplier_interpreter;
if (
  JSON.stringify(plan.supplier_interpreter) !== JSON.stringify(supplierInterpreter) ||
  supplierInterpreter.model !== FINANCE_FACTS_MODEL ||
  supplierInterpreter.execution !== "source-interpreted-local-generation-v1"
)
  throw new Error("Unqualified supplier interpreter");
if (JSON.stringify(plan.finance_host) !== JSON.stringify(financeHost))
  throw new Error("Unqualified finance model/host profile");
if (
  plan.model !== profile.model ||
  plan.protocol !== "compiled-playbook-gateway-v14-supplier-facts" ||
  !plan.modelPath.endsWith(`/${profile.revision}`) ||
  JSON.stringify(plan.settings) !==
    JSON.stringify({
      temperature: 0,
      server_max_tokens: 768,
      server_enable_thinking: false,
      seed: null,
    })
)
  throw new Error("Unsupported exact model/runtime profile");
for (const key of ["python", "architecture", "mlx", "mlx_vlm"])
  if (plan.runtime[key] !== profile[key]) throw new Error("Unqualified SDK/model runtime");
if (
  JSON.stringify(plan.runtime.files) !==
  JSON.stringify({ ...profile.weights_sha256, ...profile.model_files_sha256 })
)
  throw new Error("Unqualified model file fingerprints");

if (
  JSON.stringify(plan.thresholds) !== JSON.stringify(contract.thresholds) ||
  plan.thresholds.pass_rate !== 0.9 ||
  plan.thresholds.severity_weighted_score !== 0.9 ||
  plan.thresholds.high_failures !== 0 ||
  plan.thresholds.critical_failures !== 0
)
  throw new Error("Changed approval criteria");
if (
  plan.subjects.length !== 4 ||
  plan.subjects.some(
    (s, i) =>
      s.slug !== contract.subjects[i].slug ||
      JSON.stringify(s.cases) !== JSON.stringify(contract.subjects[i].cases),
  )
)
  throw new Error("Changed subject/cases");
const requiredSources = [
  contractPath,
  "content/expansion/playbook-model-profiles.json",
  "content/expansion/playbook-local-contract.json",
  "scripts/run-playbook.ts",
  "scripts/evaluate-solution-playbooks.mjs",
  "scripts/playbook-evaluation-proxy.mjs",
  "scripts/playbook-cli-result.mjs",
  "scripts/report-solution-playbooks.mjs",
  "scripts/adversarial-approval.mjs",
  "src/lib/adversarial/scorer.ts",
  "scripts/solution-artifact-files.ts",
  "src/lib/solutions/catalog.ts",
  "src/lib/plugins/agent-plugins.ts",
  "src/lib/plugins/artifacts.ts",
  "src/lib/plugins/conformance.ts",
  "src/lib/json.ts",
  "src/lib/errors.ts",
  "package-lock.json",
  "LICENSE",
  "src/lib/runtime/compile.ts",
  "src/lib/runtime/run.ts",
  "src/lib/runtime/types.ts",
  "src/lib/runtime/expr.ts",
  "src/lib/runtime/gateway-messages.ts",
  "src/lib/runtime/local-model-contract.ts",
  "src/lib/runtime/finance-source-facts.ts",
  "src/lib/runtime/finance-stages.ts",
  "src/lib/runtime/finance-source-facts.server.ts",
  "src/lib/runtime/supplier-source-facts.ts",
  "src/lib/runtime/supplier-source-facts.server.ts",
  "src/lib/adversarial/leak-scanner.ts",
  ...contract.subjects.map((s) => `content/playbooks/${s.slug}.yaml`),
];
if (JSON.stringify(Object.keys(plan.sourceHashes)) !== JSON.stringify(requiredSources))
  throw new Error("Missing frozen runtime/source bindings");
for (const [path, digest] of Object.entries(plan.sourceHashes))
  if (hash(readFileSync(path)) !== digest) throw new Error(`Changed source ${path}`);
const schedule = plan.subjects.flatMap((s) => s.cases.map((c) => ({ s, c })));
const rows = lines(join(dir, "outputs.jsonl"));
if (schedule.length !== 72 || rows.length !== 72)
  throw new Error("Incomplete 72-case compiled graph evaluation");
for (const [path, digest] of Object.entries(plan.sourceHashes))
  if (hash(readFileSync(join(dir, "source-snapshot", path))) !== digest)
    throw new Error("Missing or changed frozen source snapshot");
const installations = read(join(dir, "package-installations.json"));
if (!Array.isArray(installations) || installations.length !== 4)
  throw new Error("Missing packaged dependency evidence");
for (const s of plan.subjects) {
  const artifact = verifySolutionPlaybookSnapshot(
    readFileSync(`content/playbooks/${s.slug}.yaml`, "utf8"),
    s.artifact,
    join(dir, "package-snapshots", s.slug),
  );
  const installed = installations.filter((i) => i.slug === s.slug);
  if (
    installed.length !== 1 ||
    installed[0].exitCode !== 0 ||
    installed[0].packageSha256 !== artifact.sha256
  )
    throw new Error("Unbound package installation");
}
const transports = lines(join(dir, "transport.jsonl"));
const attempts = lines(join(dir, "attempts.jsonl"));
if (attempts.length !== transports.length * 2) throw new Error("Unknown/inflight step attempt");
transports.forEach(({ raw, value: t }, i) => {
  const begin = attempts[i * 2].value,
    end = attempts[i * 2 + 1].value;
  if (
    begin.event !== "step_started" ||
    end.event !== "step_completed" ||
    begin.case_id !== t.case_id ||
    end.case_id !== t.case_id ||
    begin.step !== t.step ||
    end.step !== t.step ||
    begin.request_sha256 !== hash(JSON.stringify(t.request)) ||
    end.transport_sha256 !== hash(raw) ||
    t.planHash !== planHash ||
    begin.planHash !== planHash ||
    end.planHash !== planHash ||
    t.step !== i + 1
  )
    throw new Error("Unbound/reordered transport");
});
const startup = read(join(dir, "server-start.json")),
  shutdown = read(join(dir, "server-stop.json")),
  execution = read(join(dir, "execution-summary.json"));
if (
  startup.planHash !== planHash ||
  startup.health.loaded_model !== plan.modelPath ||
  startup.pid !== shutdown.pid ||
  shutdown.shutdownObserved !== true ||
  execution.planHash !== planHash ||
  execution.completed_cases !== 72 ||
  execution.complete !== true ||
  execution.model_requests !== transports.length ||
  execution.error_cases !== 0 ||
  execution.lovable_inference_calls !== 0
)
  throw new Error("Missing exact server lifecycle or complete execution evidence");
const reviews = read(reviewsPath);
if (
  !Array.isArray(reviews) ||
  reviews.length !== 72 ||
  new Set(reviews.map((r) => r.case_id)).size !== 72
)
  throw new Error("Complete unique primary reviews required");
const expectedIds = new Set(schedule.map(({ c }) => c.id));
if (transports.some((t) => !expectedIds.has(t.value.case_id)))
  throw new Error("Unscheduled transport");
const sourceFactsAttempts = lines(join(dir, "source-facts-attempts.jsonl")).map((r) => r.value);
const financeSchedule = schedule.filter(({ s }) =>
  ["solution-monthly-finance-close", "solution-supplier-selection"].includes(s.slug),
);
if (sourceFactsAttempts.length !== financeSchedule.length * 2)
  throw new Error("Incomplete source-facts attempt journal");
financeSchedule.forEach(({ c }, i) => {
  const start = sourceFactsAttempts[i * 2],
    end = sourceFactsAttempts[i * 2 + 1];
  if (
    start.event !== "source_facts_started" ||
    end.event !== "source_facts_completed" ||
    start.case_id !== c.id ||
    end.case_id !== c.id ||
    start.planHash !== planHash ||
    end.planHash !== planHash
  )
    throw new Error("Unknown, repeated or reordered source-facts attempt");
});
const outcomes = schedule.map(({ s, c }, i) => {
  const row = rows[i].value;
  if (
    row.slug !== s.slug ||
    row.version !== s.version ||
    row.package_sha256 !== s.artifact.sha256 ||
    row.case_id !== c.id ||
    row.planHash !== planHash ||
    row.exitCode !== 0 ||
    row.output_error !== null ||
    row.signal !== null
  )
    throw new Error("Failed/unbound/reordered case");
  const run = JSON.parse(row.stdout);
  const yaml = parse(readFileSync(`content/playbooks/${s.slug}.yaml`, "utf8"));
  const trace = transports.filter((t) => t.value.case_id === c.id);
  const finance = s.slug === "solution-monthly-finance-close";
  if (
    run.status !== "ok" ||
    run.playbook_slug !== s.slug ||
    run.version !== s.version ||
    run.step_outcomes.length !== yaml.steps.length ||
    trace.length !== (finance ? 0 : yaml.steps.length)
  )
    throw new Error("Incomplete graph or unexpected finance generation");
  if (finance) {
    if (
      JSON.stringify(run.finance_execution) !== JSON.stringify(financeHost) ||
      JSON.stringify(run.local_model_evidence) !== JSON.stringify(financeHost)
    )
      throw new Error("Unbound finance interpreter or host runtime");
  } else if (
    run.local_model_evidence?.model !== plan.model ||
    run.local_model_evidence?.modelPath !== plan.modelPath ||
    JSON.stringify(run.local_model_evidence?.runtime) !==
      JSON.stringify(
        Object.fromEntries(Object.entries(plan.runtime).filter(([key]) => key !== "files")),
      ) ||
    JSON.stringify(run.local_model_evidence?.files) !== JSON.stringify(plan.runtime.files) ||
    run.local_model_evidence?.health?.loaded_model !== plan.modelPath
  )
    throw new Error("Unbound local generative runtime");
  let sourceFacts;
  if (s.slug === "solution-monthly-finance-close") {
    const evidence = run.source_facts;
    const prepared = prepareFinanceFacts(c.inputs);
    const response = validateFinanceResponse(evidence?.response, prepared);
    sourceFacts = composeFinanceFacts(prepared, response);
    const end = sourceFactsAttempts.find(
      (a) => a.case_id === c.id && a.event === "source_facts_completed",
    );
    if (
      JSON.stringify(validateFinanceResponse(JSON.parse(evidence.raw_response), prepared)) !==
        JSON.stringify(response) ||
      response.usage.input_tokens <= 0 ||
      response.usage.output_tokens <= 0 ||
      JSON.stringify(evidence.request) !== JSON.stringify(prepared.request) ||
      JSON.stringify(evidence.facts) !== JSON.stringify(sourceFacts) ||
      end.evidence_sha256 !== hash(JSON.stringify(evidence)) ||
      end.model !== FINANCE_FACTS_MODEL ||
      JSON.stringify(end.usage) !== JSON.stringify(response.usage)
    )
      throw new Error("Changed source-facts evidence, arithmetic, model or usage");
  } else if (s.slug === "solution-supplier-selection") {
    const evidence = run.source_facts;
    const prepared = prepareSupplierFacts(c.inputs);
    const response = validateSupplierResponse(JSON.parse(evidence.raw_response), prepared);
    sourceFacts = composeSupplierFacts(prepared, response);
    const end = sourceFactsAttempts.find(
      (a) => a.case_id === c.id && a.event === "source_facts_completed",
    );
    if (
      response.usage.input_tokens <= 0 ||
      response.usage.output_tokens <= 0 ||
      JSON.stringify(evidence.response) !== JSON.stringify(response) ||
      JSON.stringify(evidence.request) !== JSON.stringify(prepared.request) ||
      JSON.stringify(evidence.facts) !== JSON.stringify(sourceFacts) ||
      end.evidence_sha256 !== hash(JSON.stringify(evidence)) ||
      end.model !== FINANCE_FACTS_MODEL ||
      JSON.stringify(end.usage) !== JSON.stringify(response.usage)
    )
      throw new Error("Changed supplier source facts or usage");
  } else if (run.source_facts) throw new Error("Unscheduled source-facts interpretation");
  const previous = {};
  let combined = "";
  if (finance)
    yaml.steps.forEach((definition, j) => {
      if (definition.action !== `tool:finance.${definition.id}`)
        throw new Error("Unqualified finance graph action");
      const expected = prepareFinanceStage(definition.action.slice(5), run.source_facts, previous);
      const step = run.step_outcomes[j];
      if (
        step.step_id !== definition.id ||
        step.status !== "ok" ||
        step.attempts !== 1 ||
        JSON.stringify(step.output) !== JSON.stringify(expected) ||
        JSON.stringify(run.outputs[definition.id]) !== JSON.stringify(expected)
      )
        throw new Error("Repaired, missing or unbound accounting preparation stage");
      previous[definition.id] = { output: expected, status: "ok" };
      combined += expected.body + "\n";
    });
  trace.forEach(({ value: t }, j) => {
    const r = JSON.parse(t.raw),
      choice = r.choices?.[0],
      step = run.step_outcomes[j];
    const content = choice?.message?.content;
    if (
      t.status !== 200 ||
      r.model !== plan.modelPath ||
      choice?.finish_reason !== "stop" ||
      typeof content !== "string" ||
      !content.trim() ||
      !Number.isInteger(r.usage?.prompt_tokens) ||
      r.usage.prompt_tokens <= 0 ||
      !Number.isInteger(r.usage?.completion_tokens) ||
      r.usage.completion_tokens <= 0 ||
      r.usage.completion_tokens >= plan.settings.server_max_tokens
    )
      throw new Error("Unqualified model/usage/truncated generation");
    const expectedMessages = buildGatewayMessages(yaml.steps[j].with.prompt, {
      inputs: c.inputs,
      steps: previous,
      ...(sourceFacts ? { source_facts: sourceFacts } : {}),
    });
    if (
      t.request.model !== plan.modelPath ||
      t.request.temperature !== 0 ||
      t.request.max_tokens !== 768 ||
      t.request.chat_template_kwargs?.enable_thinking !== false ||
      JSON.stringify(t.request.messages) !== JSON.stringify(expectedMessages)
    )
      throw new Error("Wrong source context, omitted prior outputs or altered prompt");
    if (
      step.step_id !== yaml.steps[j].id ||
      step.status !== "ok" ||
      step.attempts !== 1 ||
      step.output !== content ||
      run.outputs[step.step_id] !== content
    )
      throw new Error("Repaired, repeated or mismatched step output");
    previous[step.step_id] = { output: content, status: "ok" };
    combined += content + "\n";
  });
  const review = reviews.find((r) => r.case_id === c.id);
  if (
    review.planHash !== planHash ||
    review.output_sha256 !== hash(rows[i].raw) ||
    JSON.stringify(review.transport_sha256) !== JSON.stringify(trace.map((t) => hash(t.raw))) ||
    !["pass", "fail"].includes(review.choice) ||
    typeof review.reason !== "string" ||
    !review.reason.trim()
  )
    throw new Error("Missing/unbound primary semantic review");
  const literal = c.original_case
    ? evaluateCase(c.original_case, combined)
    : { passed: true, failures: [] };
  return {
    case_id: c.id,
    slug: s.slug,
    severity: c.severity,
    passed: literal.passed && review.choice === "pass",
    failures: literal.failures,
    judge: { choice: review.choice },
    primary_reason: review.reason,
    inference_error: false,
    truncated: false,
  };
});
const weights = { low: 1, medium: 2, high: 4, critical: 8 };
const reports = plan.subjects.map((s) => {
  const os = outcomes.filter((o) => o.slug === s.slug),
    passed = os.filter((o) => o.passed).length;
  const weight = os.reduce((n, o) => n + weights[o.severity], 0),
    okWeight = os.filter((o) => o.passed).reduce((n, o) => n + weights[o.severity], 0);
  const report = {
    slug: s.slug,
    version: s.version,
    model:
      s.slug === "solution-monthly-finance-close"
        ? `typesafe/${financeHost.model}/${financeHost.execution}@node-${financeHost.node}-${financeHost.architecture}`
        : s.slug === "solution-supplier-selection"
          ? `${plan.model}+typesafe/${supplierInterpreter.model}/${supplierInterpreter.execution}`
          : plan.model,
    execution_protocol:
      s.slug === "solution-monthly-finance-close" ? financeHost.execution : plan.protocol,
    source_sha256: plan.sourceHashes[`content/playbooks/${s.slug}.yaml`],
    artifact_sha256: s.artifact.sha256,
    total: os.length,
    passed,
    failed: os.length - passed,
    pass_rate: passed / os.length,
    severity_weighted_score: okWeight / weight,
    outcomes: os,
  };
  return { ...report, eligible: eligibleForPublication(report, 18) };
});
writeFileSync(
  output,
  JSON.stringify(
    {
      planHash,
      model: plan.model,
      finance_host: financeHost,
      model_scope:
        "Per-package models and execution protocols are recorded in reports; finance uses TypeSafe interpretation plus real accounting tools, other graphs use the pinned local generator.",
      protocol: plan.protocol,
      total: 72,
      reports,
      qualificationPassed: reports.every((r) => r.eligible),
      published: false,
      registry_binding: "not verified by this offline report",
      lovable_inference_calls: 0,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    evaluated: 72,
    qualifying: reports.filter((r) => r.eligible).length,
    published: false,
  }),
);
process.exitCode = reports.every((r) => r.eligible) ? 0 : 1;
