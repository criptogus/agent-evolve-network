// Explicit finite TypeSafe stage. No Lovable calls and no automatic recovery.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { preselectAgentMatch } from "../src/lib/match/jev-agent-match.server.ts";
import { assertMatchFrozenSourcePath } from "../src/lib/match/frozen-sources.ts";
import { evidenceHash } from "../src/lib/match/paired-evaluation.ts";
const [planFile, outputDir, live, selectionFile, oldPlanFile] = process.argv.slice(2);
if (live === "--managed-only") {
  if (!planFile || !outputDir || existsSync(`${outputDir}/batch.json`))
    throw new Error("Managed preparation requires a frozen plan and a new output target");
  const rawPlan = JSON.parse(readFileSync(planFile, "utf8"));
  const plan = z
    .object({
      planHash: z.string(),
      catalog: z.array(z.unknown()).length(665),
      cases: z.array(z.unknown()).length(12),
      desired: z.unknown(),
      schedule: z.array(z.unknown()).length(72),
      sources: z.record(z.string(), z.string()),
    })
    .passthrough()
    .parse(rawPlan);
  const { planHash, ...payload } = z.record(z.string(), z.unknown()).parse(rawPlan);
  if (createHash("sha256").update(JSON.stringify(payload)).digest("hex") !== planHash)
    throw new Error("Invalid plan hash");
  if (!Object.keys(plan.sources).length) throw new Error("Missing frozen runtime sources");
  for (const [path, hash] of Object.entries(plan.sources)) {
    assertMatchFrozenSourcePath(path);
    if (!existsSync(path) || evidenceHash(readFileSync(path, "utf8")) !== hash)
      throw new Error(`Changed runtime source: ${path}`);
  }
  writeFileSync(
    `${outputDir}/batch.json`,
    JSON.stringify(
      {
        planHash,
        catalog: plan.catalog,
        cases: plan.cases,
        desired: plan.desired,
        schedule: plan.schedule,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      status: "prepared_not_evaluated",
      planHash,
      execution: "managed_backend",
      localInferenceCalls: 0,
      generatorCalls: 0,
    }),
  );
  process.exit(4);
}
if (live === "--reuse") {
  if (
    !planFile ||
    !outputDir ||
    !selectionFile ||
    !oldPlanFile ||
    existsSync(`${outputDir}/batch.json`)
  )
    throw new Error("Reuse requires NEW_DIR, preserved selections and original plan");
  const planSchema = z
    .object({
      planHash: z.string(),
      catalog: z.array(z.unknown()).length(665),
      cases: z.array(z.unknown()).length(12),
      criteria: z.unknown(),
      desired: z.unknown(),
      schedule: z.array(z.unknown()).length(72),
      sources: z.record(z.string(), z.string()),
    })
    .passthrough();
  const current = planSchema.parse(JSON.parse(readFileSync(planFile, "utf8")));
  const old = planSchema.parse(JSON.parse(readFileSync(oldPlanFile, "utf8")));
  for (const file of [planFile, oldPlanFile]) {
    const record = z.record(z.string(), z.unknown()).parse(JSON.parse(readFileSync(file, "utf8")));
    const { planHash, ...payload } = record;
    if (createHash("sha256").update(JSON.stringify(payload)).digest("hex") !== planHash)
      throw new Error("Invalid plan hash");
  }
  for (const key of ["catalog", "cases", "criteria", "desired", "schedule"] as const)
    if (JSON.stringify(current[key]) !== JSON.stringify(old[key]))
      throw new Error(`Changed frozen ${key}`);
  for (const path of ["src/lib/match/jev-selection.ts", "src/lib/match/jev-agent-match.server.ts"])
    if (current.sources[path] !== old.sources[path])
      throw new Error("Changed selector cannot reuse selections");
  const evidence = z
    .object({
      planHash: z.string(),
      completed: z.literal(36),
      results: z
        .array(
          z.object({
            caseId: z.string(),
            repeat: z.number().int().min(0).max(2),
            candidates: z.array(z.object({ slug: z.string() })).min(1),
            trace: z
              .object({
                model: z.literal("jev-1.14.0"),
                usage_complete: z.literal(true),
                elapsed_ms: z.number().positive(),
              })
              .passthrough(),
          }),
        )
        .length(36),
    })
    .parse(JSON.parse(readFileSync(selectionFile, "utf8")));
  if (
    evidence.planHash !== old.planHash ||
    new Set(evidence.results.map((r) => `${r.caseId}:${r.repeat}`)).size !== 36
  )
    throw new Error("Invalid original selection binding");
  const batch = {
    planHash: current.planHash,
    catalog: current.catalog,
    cases: current.cases,
    desired: current.desired,
    schedule: current.schedule,
    selections: evidence.results.map((r) => ({
      caseId: r.caseId,
      repeat: r.repeat,
      slugs: r.candidates.map((c) => c.slug),
      trace: r.trace,
    })),
    selectionProvenance: {
      originalPlanHash: old.planHash,
      fileSha256: createHash("sha256").update(readFileSync(selectionFile)).digest("hex"),
      reason:
        "Only generator prompt changed; exact selector/catalog/briefs/counts/criteria unchanged; no replayed inference",
    },
  };
  writeFileSync(
    `${outputDir}/batch.json`,
    JSON.stringify(
      { ...batch, batchHash: createHash("sha256").update(JSON.stringify(batch)).digest("hex") },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      status: "rebound_real_selection_not_qualification",
      observations: 36,
      newCalls: 0,
      planHash: current.planHash,
    }),
  );
  process.exit(0);
}

if (!planFile || !outputDir || live !== "--live" || !process.env.TYPESAFE_API_KEY)
  throw new Error(
    "Usage: prepare-agent-match-live.ts PLAN EXISTING_NEW_DIR --live (TypeSafe key required)",
  );
const target = `${outputDir}/selections.json`;
if (existsSync(target) || existsSync(`${outputDir}/attempts.jsonl`))
  throw new Error("Existing evidence; refusing replay");
const candidate = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  description: z.string(),
});
const raw = JSON.parse(readFileSync(planFile, "utf8"));
const plan = z
  .object({
    planHash: z.string(),
    catalog: z.array(candidate).min(1).max(800),
    cases: z.array(z.object({ id: z.string(), brief: z.string() })).length(12),
    desired: z.object({
      skills: z.number(),
      playbooks: z.number(),
      souls: z.number(),
      guardrails: z.number(),
    }),
    schedule: z
      .array(z.object({ caseId: z.string(), repeat: z.number(), arm: z.enum(["baseline", "jev"]) }))
      .length(72),
  })
  .parse(raw);
const results = [];
for (const step of plan.schedule.filter((s) => s.arm === "jev")) {
  const item = plan.cases.find((c) => c.id === step.caseId);
  if (!item) throw new Error("Unknown case");
  const journal = { step, startedAt: new Date().toISOString() };
  writeFileSync(`${outputDir}/attempts.jsonl`, JSON.stringify(journal) + "\n", {
    flag: "a",
    mode: 0o600,
  });
  const responses: unknown[] = [];
  const transport: typeof fetch = async (url, init) => {
    const response = await fetch(url, init);
    try {
      responses.push({
        request: JSON.parse(String(init?.body)),
        response: await response.clone().json(),
      });
    } catch {
      responses.push({ invalidJson: true, status: response.status });
    }
    return response;
  };
  const result = await preselectAgentMatch(
    { brief: item.brief, catalog: plan.catalog, desired: plan.desired, consent: true },
    { mode: "filter", fetch: transport },
  );
  results.push({ ...step, ...result, responses });
  writeFileSync(
    target,
    JSON.stringify(
      {
        planHash: plan.planHash,
        stage: "real_jev_preselection_additive_timing",
        completed: results.length,
        total: 36,
        results,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  writeFileSync(
    `${outputDir}/attempts.jsonl`,
    JSON.stringify({
      ...journal,
      completedAt: new Date().toISOString(),
      usageComplete: result.trace.usage_complete,
    }) + "\n",
    { flag: "a", mode: 0o600 },
  );
  console.log(JSON.stringify({ caseId: step.caseId, repeat: step.repeat, ...result.trace }));
  if (!result.trace.usage_complete) {
    process.exitCode = 4;
    break;
  }
}
if (results.length !== 36) process.exitCode = 4;
else {
  const batch = {
    planHash: plan.planHash,
    catalog: plan.catalog,
    desired: plan.desired,
    cases: plan.cases,
    schedule: plan.schedule,
    selections: results.map((r) => ({
      caseId: r.caseId,
      repeat: r.repeat,
      slugs: r.candidates.map((c) => c.slug),
      trace: r.trace,
    })),
    authorization: { lovableInferenceUsdLimit: 5, maximumGeneratorCalls: 72, automaticRetries: 0 },
    stageTiming:
      "Jev measured locally; generator measured in managed preview. Additive stage timing is not production network latency.",
  };
  writeFileSync(
    `${outputDir}/batch.json`,
    JSON.stringify(
      { ...batch, batchHash: createHash("sha256").update(JSON.stringify(batch)).digest("hex") },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}
