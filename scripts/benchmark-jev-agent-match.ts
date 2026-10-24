// Explicit live TypeSafe-only check; never part of check:project or CI.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { preselectAgentMatch } from "../src/lib/match/jev-agent-match.server.ts";
const [outputDir, live] = process.argv.slice(2);
if (
  !outputDir ||
  live !== "--live" ||
  process.argv.length !== 4 ||
  existsSync(outputDir) ||
  !process.env.TYPESAFE_API_KEY
)
  throw new Error(
    "Provide TYPESAFE_API_KEY and run benchmark-jev-agent-match.ts NEW_OUTPUT_DIR --live",
  );
const Case = z.object({ id: z.string(), brief: z.string(), expected: z.string() });
const cases = z
  .array(Case)
  .length(8)
  .parse(JSON.parse(readFileSync("tests/fixtures/jev-discovery.json", "utf8")));
const Candidate = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  description: z.string(),
});
const slugs = z
  .array(z.object({ slug: z.string() }))
  .length(21)
  .parse(JSON.parse(readFileSync("content/expansion/skills.json", "utf8")));
const catalog = slugs.map(({ slug }) =>
  Candidate.parse(parse(readFileSync(`content/skills/${slug}.yaml`, "utf8"))),
);
mkdirSync(outputDir);
const results = [];
for (const item of cases) {
  const responses: unknown[] = [];
  const transport: typeof fetch = async (url, init) => {
    const response = await fetch(url, init);
    // The fixture contains only public metadata/synthetic queries. No headers
    // or credentials are retained, and the adapter validates the same response.
    const body: unknown = await response.clone().json();
    responses.push(body);
    return response;
  };
  const result = await preselectAgentMatch(
    {
      brief: item.brief,
      catalog,
      desired: { skills: 1, playbooks: 0, souls: 0, guardrails: 0 },
      consent: true,
    },
    { mode: "filter", fetch: transport },
  );
  const parsed = z
    .object({ answers: z.record(z.string(), z.object({ noul: z.number() })) })
    .safeParse(responses[0]);
  const expectedIndex = catalog.findIndex((c) => c.slug === item.expected);
  const probability =
    expectedIndex < 0 || !parsed.success ? null : parsed.data.answers[`c${expectedIndex}`]?.noul;
  const passed =
    result.trace.usage_complete &&
    result.trace.model !== null &&
    (item.expected === "none"
      ? result.trace.reason !== "selected" && result.candidates.length === catalog.length
      : probability !== null &&
        probability >= 0.8 &&
        result.candidates.some((c) => c.slug === item.expected));
  results.push({
    ...item,
    passed,
    expected_probability: probability,
    trace: result.trace,
    forwarded: result.candidates.map((c) => c.slug),
    responses,
  });
  writeFileSync(
    `${outputDir}/results.json`,
    JSON.stringify(
      {
        scope:
          "Real production Jev adapter; synthetic smoke test, not end-to-end generative quality qualification",
        completed: results.length,
        total: cases.length,
        passed: results.filter((r) => r.passed).length,
        results,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}
console.log(
  JSON.stringify({
    completed: results.length,
    passed: results.filter((r) => r.passed).length,
    total: cases.length,
    input_tokens: results.reduce((n, r) => n + r.trace.input_tokens, 0),
    output_tokens: results.reduce((n, r) => n + r.trace.output_tokens, 0),
    forwarded: results.map((r) => r.trace.forwarded_count),
  }),
);
process.exitCode = results.every((r) => r.passed) ? 0 : 1;
