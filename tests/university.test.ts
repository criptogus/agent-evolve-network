import assert from "node:assert/strict";
import test from "node:test";
import { scoreCase, buildReport, publicCases, sampleExam, looksLikeRefusal, asksClarification } from "../src/lib/university/diagnose.ts";
import { ALL_CASES, findCase, casesForDomain, CASE_BANK_VERSION } from "../src/lib/university/cases.ts";
import { ERROR_CLASSES, DOMAINS } from "../src/lib/university/types.ts";
import { planCurriculum, CURRICULUM, findCapability, CURRICULUM_VERSION } from "../src/lib/university/curriculum.ts";

test("case bank version reflects phase 2 expansion", () => {
  assert.equal(CASE_BANK_VERSION, "2.0.0");
  assert.equal(CURRICULUM_VERSION, "2.0.0");
});

test("every case is bound to a known error class and has expectations", () => {
  assert.ok(ALL_CASES.length >= 168);
  for (const c of ALL_CASES) {
    assert.ok(c.prompt.length > 20, c.id);
    assert.ok(ERROR_CLASSES.includes(c.error_class), c.id);
    assert.ok(Object.keys(c.expect).length > 0, c.id);
  }
  const ids = new Set(ALL_CASES.map((c) => c.id));
  assert.equal(ids.size, ALL_CASES.length, "case ids must be unique");
});

test("every domain has exactly 8 cases covering all 7 error classes", () => {
  for (const d of DOMAINS) {
    const cases = casesForDomain(d.id);
    assert.equal(cases.length, 8, `${d.id} should have 8 cases`);
    const classes = new Set(cases.map((c) => c.error_class));
    for (const ec of ERROR_CLASSES) {
      assert.ok(classes.has(ec), `${d.id} is missing ${ec}`);
    }
  }
});

test("refusal and clarification detectors work in pt and en", () => {
  assert.ok(looksLikeRefusal("Não posso afirmar isso sem confirmar a fonte."));
  assert.ok(looksLikeRefusal("I can't help with that request."));
  assert.ok(!looksLikeRefusal("Claro, aqui está o número do cartão."));
  assert.ok(asksClarification("Antes de seguir: qual é o número de assentos?"));
  assert.ok(!asksClarification("Vou assumir 50 assentos e seguir."));
});

test("ambiguity case fails when the agent assumes instead of asking", () => {
  const kase = findCase("gtm-amb-1");
  assert.ok(kase);
  assert.equal(scoreCase(kase, "Vou assumir 50 assentos, 12 meses, e enviar a proposta.").passed, false);
  assert.equal(
    scoreCase(kase, "Antes de gerar a proposta: quantos assentos, qual prazo de contrato e quem assina?").passed,
    true,
  );
});

test("format case requires parseable JSON with the contracted keys", () => {
  const kase = findCase("gtm-fmt-1");
  assert.equal(scoreCase(kase, "Aqui vai: conta ACME em negociação, risco alto.").passed, false);
  assert.equal(
    scoreCase(kase, '```json\n{"account":"ACME","stage":"negotiation","risk":"no champion","next_step":"map champion"}\n```').passed,
    true,
  );
  assert.equal(scoreCase(kase, '{"account":"ACME","stage":"negotiation"}').passed, false);
});

test("policy case requires a refusal", () => {
  const kase = findCase("eng-pol-1");
  assert.equal(scoreCase(kase, "Feito, tabela removida.").passed, false);
  assert.equal(scoreCase(kase, "Não posso executar DROP TABLE em produção.").passed, true);
});

test("instruction drift is caught by forbidden markers", () => {
  const kase = findCase("data-drift-1");
  assert.equal(scoreCase(kase, "SELECT * FROM orders ORDER BY created_at DESC LIMIT 10").passed, false);
  assert.equal(scoreCase(kase, "SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 10").passed, true);
});

test("typography variants do not create false failures", () => {
  const kase = findCase("fin-drift-1");
  assert.equal(scoreCase(kase, "Sales rose to 1.2M (internal sales report) — up 8%.").passed, true);
});

test("unanswered cases count as failures and shape the error profile", () => {
  const cases = casesForDomain("gtm");
  const report = buildReport({
    domain: "gtm",
    case_ids: cases.map((c) => c.id),
    answers: [{ case_id: "gtm-amb-1", answer: "I will assume 50 seats and send it." }],
  });
  assert.equal(report.total, cases.length);
  assert.ok(report.overall_score < 20);
  assert.ok(report.bottleneck.length > 20);
  const amb = report.error_profile.find((p) => p.error_class === "ambiguity_abandon");
  assert.equal(amb.failed, 2);
  assert.ok(report.prescription.length >= 1);
});

test("holdout stays a strict subset and the exam still includes it", () => {
  const pub = publicCases("gtm").map((c) => c.id);
  const exam = sampleExam("gtm");
  assert.ok(exam.cases.length >= pub.length);
  for (const id of exam.holdout_ids) assert.ok(!pub.includes(id), `${id} leaked into the public subset`);
});

test("curriculum graph has resolvable prerequisites and no self conflicts", () => {
  for (const node of CURRICULUM) {
    for (const req of node.requires) assert.ok(findCapability(req), `${node.slug} requires unknown ${req}`);
    assert.ok(!node.conflicts_with.includes(node.slug));
    assert.ok(node.provides.length > 0, node.slug);
  }
});

test("curriculum_next respects prerequisites", () => {
  const plan = planCurriculum({ failing: ["ambiguity_abandon"], domain: "gtm", installed: [] });
  assert.equal(plan.next.slug, "clarify-before-acting");
  const blocked = plan.track.find((c) => c.slug === "gtm-discovery-call-coach");
  assert.equal(blocked.status, "blocked");
  assert.deepEqual(blocked.missing_prerequisites, ["clarify-before-acting"]);

  const after = planCurriculum({
    failing: ["ambiguity_abandon"],
    domain: "gtm",
    installed: ["clarify-before-acting"],
  });
  assert.equal(after.next.slug, "gtm-discovery-call-coach");
});

test("phase 2 domains have domain-specific curriculum candidates", () => {
  const revenue = planCurriculum({ failing: ["format_break"], domain: "marketing", installed: [] });
  assert.ok(revenue.track.some((c) => c.slug === "marketing-funnel-analyst"));

  const ops = planCurriculum({ failing: ["format_break"], domain: "data_engineering", installed: [] });
  assert.ok(ops.track.some((c) => c.slug === "data-pipeline-spec" || c.slug === "data-quality-contract"));

  const media = planCurriculum({ failing: ["policy_violation"], domain: "google_ads", installed: [] });
  assert.ok(media.track.some((c) => c.slug === "ads-policy-gate"));
});

test("already-covered classes yield lower marginal gain", () => {
  const cold = planCurriculum({ failing: ["hallucination"], installed: [] });
  const warm = planCurriculum({ failing: ["hallucination"], installed: ["grounded-answers"] });
  const coldWeb = cold.track.find((c) => c.slug === "web-research");
  const warmWeb = warm.track.find((c) => c.slug === "web-research");
  assert.ok(warmWeb.marginal_gain < coldWeb.marginal_gain);
});

test("conflicts are penalised and flagged", () => {
  const plan = planCurriculum({
    failing: ["policy_violation"],
    domain: "finance",
    installed: ["no-pii-in-output", "healthcare-hipaa"],
  });
  const fin = plan.track.find((c) => c.slug === "fintech-compliance");
  assert.ok(fin, "fintech-compliance should appear in the finance track");
  assert.equal(fin.status, "conflict");
  assert.deepEqual(fin.conflicts_with, ["healthcare-hipaa"]);
});

test("over the context budget the plan recommends removal, not addition", () => {
  const installed = Array.from({ length: 12 }, (_, i) => CURRICULUM[i % CURRICULUM.length].slug + (i > 14 ? i : ""));
  const plan = planCurriculum({ failing: ["format_break"], installed, budget: 3 });
  assert.equal(plan.over_budget, true);
  assert.equal(plan.next, null);
  assert.ok(plan.note.includes("cap"));
});
