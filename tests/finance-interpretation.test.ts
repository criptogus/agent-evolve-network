import test from "node:test";
import assert from "node:assert/strict";
import { financeInputs, financeEvidenceFixture } from "./fixtures/finance-source-fixture.ts";
import {
  prepareFinanceRoles,
  prepareFinanceFields,
  reconstructFinanceInterpretation,
} from "../src/lib/runtime/finance-interpretation.ts";
import { validateFinanceResponse } from "../src/lib/runtime/finance-source-facts.ts";
import { deriveFinanceSourceFacts } from "../src/lib/runtime/finance-source-facts.server.ts";
test("dependent finance interpretation preserves two original calls and actual summed usage", async () => {
  const expected = financeEvidenceFixture();
  let index = 0;
  const transport: typeof fetch = async (url, init) => {
    assert.equal(String(url), "https://api.typesafe.ai/v1/systemone");
    const call = expected.provider_calls[index++];
    assert.ok(call, "No retry or additional provider call");
    assert.deepEqual(JSON.parse(String(init?.body)), call.request);
    return new Response(call.raw_response, { status: call.status });
  };
  const actual = await deriveFinanceSourceFacts(financeInputs, "fixture-private-key", transport);
  assert.deepEqual(actual, expected);
  assert.equal(index, 2);
  assert.equal(actual.response.usage.input_tokens, 200);
  assert.equal(actual.response.usage.output_tokens, 100);
  assert.equal(actual.response_scope, "aggregate_of_two_validated_provider_calls");
  assert.equal(actual.facts.totals.current_cash.display, "EUR 25.00");
});
test("field request depends on verified role response and never asks unrelated record branches", () => {
  const e = financeEvidenceFixture(),
    p = prepareFinanceRoles(financeInputs);
  const roles = validateFinanceResponse(JSON.parse(e.provider_calls[0].raw_response), p);
  const fields = prepareFinanceFields(p, roles);
  assert.ok(
    Object.keys(p.request.questions).every(
      (k) => k.startsWith("type_") || k === "attachment_route",
    ),
  );
  const invoice = p.prepared.ids.indexOf("A-1"),
    cash = p.prepared.ids.indexOf("B-2");
  assert.ok(fields.questions[`amount_${invoice}`]);
  assert.ok(!fields.questions[`direction_${invoice}`]);
  assert.ok(!fields.questions[`invoice_${invoice}`]);
  assert.ok(fields.questions[`direction_${cash}`]);
  assert.match(fields.questions[`amount_${invoice}`].instructions, /A-1 as a invoice record/);
  assert.deepEqual(fields.state.original_sources, p.request.state.original_sources);
  assert.ok(!("attachment_context" in fields.state));
  assert.ok(!Object.keys(e.response.answers).some((k) => k === `direction_${invoice}`));
});
test("reconstruction rejects swapped, missing, changed-source and missing-field evidence without padding", () => {
  const e = financeEvidenceFixture();
  assert.throws(() =>
    reconstructFinanceInterpretation(financeInputs, [...e.provider_calls].reverse()),
  );
  assert.throws(() =>
    reconstructFinanceInterpretation(financeInputs, e.provider_calls.slice(0, 1)),
  );
  assert.throws(() =>
    reconstructFinanceInterpretation(
      { ...financeInputs, source_2: financeInputs.source_2 + " Changed owner." },
      e.provider_calls,
    ),
  );
  const calls = structuredClone(e.provider_calls);
  const raw = JSON.parse(calls[1].raw_response);
  delete raw.answers[Object.keys(raw.answers).find((k) => k.startsWith("amount_"))!];
  calls[1].raw_response = JSON.stringify(raw);
  assert.throws(() => reconstructFinanceInterpretation(financeInputs, calls));
});
test("invalid first response prevents dependent call; second failure preserves both safe receipts", async () => {
  let calls = 0;
  const receipts: unknown[] = [];
  await assert.rejects(
    deriveFinanceSourceFacts(
      financeInputs,
      "fixture-private-key",
      async () => {
        calls++;
        return new Response('{"model":"wrong-model"}');
      },
      (e) => receipts.push(e),
    ),
  );
  assert.equal(calls, 1);
  assert.equal(receipts.length, 1);
  const expected = financeEvidenceFixture();
  calls = 0;
  receipts.length = 0;
  const noUsage = JSON.parse(expected.provider_calls[0].raw_response);
  noUsage.usage.input_tokens = 0;
  await assert.rejects(
    deriveFinanceSourceFacts(
      financeInputs,
      "fixture-private-key",
      async () => {
        calls++;
        return new Response(JSON.stringify(noUsage));
      },
      (e) => receipts.push(e),
    ),
  );
  assert.equal(calls, 1, "Missing first-call usage cannot start a dependent inference");
  assert.equal(receipts.length, 1);
  calls = 0;
  receipts.length = 0;
  await assert.rejects(
    deriveFinanceSourceFacts(
      financeInputs,
      "fixture-private-key",
      async () => {
        const call = expected.provider_calls[calls++];
        return new Response(calls === 1 ? call.raw_response : "not-json");
      },
      (e) => receipts.push(e),
    ),
  );
  assert.equal(calls, 2);
  assert.equal(receipts.length, 2);
  assert.ok(!JSON.stringify(receipts).includes("fixture-private-key"));
});
