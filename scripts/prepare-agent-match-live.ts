// Explicit finite TypeSafe stage. No Lovable calls and no automatic recovery.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { preselectAgentMatch } from "../src/lib/match/jev-agent-match.server.ts";
const [planFile, outputDir, live] = process.argv.slice(2);
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
