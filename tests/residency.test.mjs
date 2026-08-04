import assert from "node:assert/strict";
import test from "node:test";
import {
  planRound,
  gradeRound,
  residencyScore,
  ROUND_SIZE,
  TOTAL_ROUNDS,
  PASS_THRESHOLD,
  RESIDENCY_VERSION,
} from "../src/lib/university/residency.ts";
import { casesForDomain } from "../src/lib/university/cases.ts";

test("residency version is pinned", () => {
  assert.equal(RESIDENCY_VERSION, "1.0.0");
});

test("planRound devolve o tamanho pedido e marca a classe treinada", () => {
  const plan = planRound({ domain: "gtm", focus: ["hallucination"], round: 1 });
  assert.equal(plan.tasks.length, ROUND_SIZE);
  assert.equal(plan.total_rounds, TOTAL_ROUNDS);
  assert.equal(plan.pass_threshold, PASS_THRESHOLD);
  assert.ok(plan.tasks.every((t) => typeof t.drills === "string" && t.prompt.length > 10));
  const focused = casesForDomain("gtm").filter((c) => c.error_class === "hallucination");
  if (focused.length) assert.equal(plan.tasks[0].drills, "hallucination");
});

test("rodadas diferentes não repetem a mesma sequência de casos", () => {
  const r1 = planRound({ domain: "marketing", round: 1 });
  const r2 = planRound({ domain: "marketing", round: 2 });
  assert.notDeepEqual(
    r1.tasks.map((t) => t.case_id),
    r2.tasks.map((t) => t.case_id),
  );
});

test("respostas vazias reprovam a rodada e recebem coach prescritivo", () => {
  const plan = planRound({ domain: "finance", round: 1 });
  const result = gradeRound({
    domain: "finance",
    round: 1,
    case_ids: plan.tasks.map((t) => t.case_id),
    answers: plan.tasks.map((t) => ({ case_id: t.case_id, answer: "" })),
  });
  assert.equal(result.score, 0);
  assert.equal(result.passed, false);
  assert.equal(result.feedback.length, plan.tasks.length);
  assert.ok(result.feedback.every((f) => f.coach.length > 20));
  assert.ok(result.next_step.toLowerCase().includes("repita"));
  assert.ok(result.still_failing.length > 0);
});

test("residencyScore é a média das rodadas aprovadas", () => {
  assert.equal(residencyScore([]), 0);
  assert.equal(residencyScore([100, 75, 80]), 85);
});
