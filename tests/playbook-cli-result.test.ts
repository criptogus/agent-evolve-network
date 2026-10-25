import test from "node:test";
import assert from "node:assert/strict";
import { decodePlaybookCliResult } from "../scripts/playbook-cli-result.mjs";
test("zero process exit cannot qualify truncated or empty CLI output", () => {
  for (const text of ["", '{"status":"ok","step_outcomes":[', "null", "[]"])
    assert.ok(decodePlaybookCliResult(text, 0).error);
  assert.equal(
    decodePlaybookCliResult('{"status":"ok","step_outcomes":[]}', 0).error,
    "success_without_complete_graph",
  );
});
test("decoder preserves complete error evidence and never repairs partial JSON", () => {
  const raw = '{"status":"error","stage":"source_facts"}';
  assert.deepEqual(decodePlaybookCliResult(raw, 2), { value: JSON.parse(raw), error: null });
  const partial = '{"status":"ok"';
  assert.equal(decodePlaybookCliResult(partial, 0).value, null);
  assert.equal(partial, '{"status":"ok"');
});
