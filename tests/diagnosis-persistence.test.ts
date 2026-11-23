import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

test("anonymous exam round trip uses capability externally and UUID in database writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "diagnosis-probe-"));
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
  const fixtureId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const writes: Array<{
    table: string;
    value: Record<string, unknown> | Array<Record<string, unknown>>;
  }> = [];
  let row: Record<string, unknown>;
  const db = {
    from(table: string) {
      let data: unknown;
      return {
        insert(value: Record<string, unknown> | Array<Record<string, unknown>>) {
          writes.push({ table, value });
          if (table === "agent_diagnoses") {
            row = { ...value, id: fixtureId };
            data = { id: fixtureId };
          }
          return this;
        },
        update(value: Record<string, unknown> | Array<Record<string, unknown>>) {
          writes.push({ table, value });
          data = [{ id: fixtureId }];
          return this;
        },
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single: async () => ({ data }),
        maybeSingle: async () => ({ data: row }),
        then(resolve: (result: { data: unknown }) => unknown) {
          return Promise.resolve({ data }).then(resolve);
        },
      };
    },
  };
  (globalThis as unknown as { __diagnosisDb?: unknown }).__diagnosisDb = db;
  try {
    const result = await build({
      entryPoints: ["src/lib/university/university.server.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      plugins: [
        {
          name: "test-db",
          setup(b) {
            b.onResolve({ filter: /integrations\/supabase\/client.server/ }, () => ({
              path: "db",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: "export const supabaseAdmin=globalThis.__diagnosisDb;",
              loader: "js",
            }));
          },
        },
      ],
    });
    const file = join(dir, "exam.mjs");
    await writeFile(file, result.outputFiles[0].text);
    const api = await import(pathToFileURL(file).href);
    const started = await api.startExam({ domain: "gtm", limit: 1 });
    assert.match(started.diagnosis_id, /^[\da-f-]+\.[\da-f]{64}$/);
    const report = await api.submitExam({
      diagnosisId: started.diagnosis_id,
      answers: [{ case_id: started.tasks[0].case_id, answer: "test" }],
    });
    assert.equal(report.diagnosis_id, started.diagnosis_id);
    const items = writes.find((w) => w.table === "agent_diagnosis_items")!.value as Array<
      Record<string, unknown>
    >;
    assert.ok(items.length > 0);
    assert.ok(items.every((i) => i.diagnosis_id === fixtureId));
    await assert.rejects(
      () => api.submitExam({ diagnosisId: fixtureId, answers: [] }),
      (e) => (e as Response).status === 404,
    );
    row.user_id = "alice";
    await assert.rejects(
      () => api.submitExam({ diagnosisId: fixtureId, userId: "bob", answers: [] }),
      (e) => (e as Response).status === 404,
    );
  } finally {
    delete (globalThis as unknown as { __diagnosisDb?: unknown }).__diagnosisDb;
    if (secret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = secret;
    await rm(dir, { recursive: true, force: true });
  }
});
