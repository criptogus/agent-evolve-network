/** Read-only progress evidence. Never infers liveness, grades a response or approves publication. */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const lines = (p) =>
  existsSync(p)
    ? readFileSync(p, "utf8")
        .split("\n")
        .filter((s) => s.trim())
        .map((s) => JSON.parse(s))
    : [];
export function inspectSolutionEvaluation(dir) {
  const { planHash, ...plan } = read(join(dir, "plan.json"));
  if (hash(JSON.stringify(plan)) !== planHash) throw new Error("Changed evaluation plan");
  const schedule = plan.subjects.flatMap((s) =>
    s.cases.map((c) => ({
      slug: s.slug,
      version: s.version,
      package_sha256: s.artifact.sha256,
      case_id: c.id,
    })),
  );
  if (
    plan.subjects.length !== 4 ||
    schedule.length !== 72 ||
    new Set(schedule.map((c) => c.case_id)).size !== 72
  )
    throw new Error("Full four-subject schedule required");
  const outputs = lines(join(dir, "outputs.jsonl")),
    attempts = lines(join(dir, "attempts.jsonl")),
    transports = lines(join(dir, "transport.jsonl")),
    facts = lines(join(dir, "source-facts-attempts.jsonl"));
  if (!outputs.length && !attempts.length && !facts.length)
    throw new Error("No execution evidence; refusing empty preparation success");
  for (const list of [outputs, attempts, transports, facts])
    for (const row of list)
      if (row.planHash !== planHash || !schedule.some((c) => c.case_id === row.case_id))
        throw new Error("Unscheduled or unbound execution evidence");
  outputs.forEach((r, i) => {
    const c = schedule[i];
    if (
      !c ||
      r.case_id !== c.case_id ||
      r.slug !== c.slug ||
      r.version !== c.version ||
      r.package_sha256 !== c.package_sha256
    )
      throw new Error("Reordered or substituted case");
  });
  const reviews = lines(join(dir, "primary-reviews.jsonl"));
  const events = (name) => attempts.filter((a) => a.event === name).length;
  const completed = events("step_completed"),
    started = events("step_started"),
    unknown = events("step_unknown");
  if (completed !== transports.length || completed + unknown > started)
    throw new Error("Inconsistent step journal");
  const summaries = outputs.map((row) => {
    let out;
    try {
      out = JSON.parse(row.stdout);
    } catch {
      if (row.exitCode === 0 && !row.output_error)
        throw new Error("Successful case has no parseable result");
      out = { status: row.output_error ? "invalid_result" : "no_result" };
    }
    return {
      case_id: row.case_id,
      exitCode: row.exitCode,
      output_error: row.output_error ?? null,
      graph_status: out.status,
      steps: out.step_outcomes?.length ?? 0,
      primary_review: "required",
      output_sha256: hash(JSON.stringify(row)),
    };
  });
  let primaryReviews = reviews.length;
  const reviewPath = join(dir, "primary-reviews.json");
  if (existsSync(reviewPath)) {
    const r = read(reviewPath);
    if (!Array.isArray(r)) throw new Error("Invalid primary review file");
    primaryReviews += r.length;
  }
  const stop = existsSync(join(dir, "server-stop.json"))
    ? read(join(dir, "server-stop.json"))
    : null;
  return {
    scope: "Diagnostic progress only; not a qualification or liveness check",
    planHash,
    stop_requested: existsSync(join(dir, "STOP-AFTER-CURRENT-CASE")),
    scheduled_cases: 72,
    recorded_cases: outputs.length,
    pending_cases: 72 - outputs.length,
    error_cases: outputs.filter((r) => r.exitCode !== 0 || r.output_error).length,
    steps: { started, completed, unknown, inflight_or_unaccounted: started - completed - unknown },
    source_facts: {
      started: facts.filter((r) => r.event === "source_facts_started").length,
      completed: facts.filter((r) => r.event === "source_facts_completed").length,
      unknown: facts.filter((r) => r.event === "source_facts_unknown").length,
    },
    primary_reviews_recorded: primaryReviews,
    shutdown_observed: stop?.shutdownObserved === true,
    publicationApproved: false,
    model_calls_made_by_inspector: 0,
    production_writes: 0,
    cases: summaries,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [dir, output, ...extra] = process.argv.slice(2);
  if (!dir || !output || extra.length || existsSync(output))
    throw new Error("Usage: EVIDENCE_DIR NEW_REPORT_JSON; existing reports are preserved");
  const report = inspectSolutionEvaluation(dir);
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      recorded_cases: report.recorded_cases,
      pending_cases: report.pending_cases,
      unknown: report.steps.unknown,
      publicationApproved: false,
    }),
  );
  process.exitCode =
    report.error_cases || report.steps.unknown || report.source_facts.unknown ? 2 : 4;
}
