import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { supplierInputs, supplierEvidenceFixture } from "./fixtures/supplier-source-fixture.ts";
import { composeSupplierFacts } from "../src/lib/runtime/supplier-source-facts.ts";
import { prepareSupplierStage } from "../src/lib/runtime/supplier-stages.ts";
import { compilePlaybook } from "../src/lib/runtime/compile.ts";
import { runPlaybook } from "../src/lib/runtime/run.ts";
function evidence() {
  const { p, r } = supplierEvidenceFixture();
  return {
    request: p.request,
    response: r,
    facts: composeSupplierFacts(p, r),
    raw_response: JSON.stringify(r),
  };
}
test("supplier graph uses real domain preparation with correct field citations and a pending buyer gate", async () => {
  const e = evidence();
  let drafts = 0;
  const r = await runPlaybook(
    compilePlaybook(
      parse(readFileSync("content/playbooks/solution-supplier-selection.yaml", "utf8")),
    ),
    supplierInputs,
    {
      invokeInstruction: async () => {
        drafts++;
        return "Wrong source attribution and unsupported award";
      },
      invokeSkill: async () => {
        throw new Error("Unexpected supplier delegation");
      },
      invokeTool: async ({ name, context }) => prepareSupplierStage(name, e, context.steps),
    },
  );
  assert.equal(r.status, "ok");
  assert.equal(drafts, 0, "A draft cannot replace source-bound procurement state");
  assert.match((r.outputs.compare as { body: string }).body, /EUR 142.00/);
  assert.match((r.outputs.risk as { body: string }).body, /100% prepayment[^\n]+\[source_3\]/);
  assert.match((r.outputs.award as { body: string }).body, /Provisional preference Z-8/);
  assert.deepEqual((r.outputs.award as { buyer_review: unknown }).buyer_review, {
    status: "pending_authenticated_human_review",
    verified: false,
  });
  assert.equal((r.outputs.award as { award_performed: boolean }).award_performed, false);
});
test("supplier preparation rejects unknown tools, missing predecessors and changed evidence", () => {
  const e = evidence();
  assert.throws(() => prepareSupplierStage("supplier.pay", e, {}));
  assert.throws(() => prepareSupplierStage("supplier.award", e, {}));
  const scope = prepareSupplierStage("supplier.scope", e, {});
  const altered = structuredClone(e);
  altered.facts.quotes[0].landed_cost_minor = "1";
  assert.throws(() =>
    prepareSupplierStage("supplier.compare", altered, { scope: { status: "ok", output: scope } }),
  );
});
test("custom procurement priorities do not invent weighted scores or award authority", () => {
  const e = evidence();
  e.facts.comparison_policy.interpretation.choice = "other";
  const steps: Record<string, { status: string; output: unknown }> = {};
  for (const stage of ["scope", "compare", "risk", "award"]) {
    const output = prepareSupplierStage(`supplier.${stage}`, e, steps);
    steps[stage] = { status: "ok", output };
  }
  const award = steps.award.output as { body: string; award_performed: boolean };
  assert.match(award.body, /No supported provisional preference/);
  assert.match(award.body, /without inventing weighted scores/);
  assert.equal(award.award_performed, false);
});
