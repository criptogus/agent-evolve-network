import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/database.ts";
import { readFileSync } from "node:fs";
import { submitAuthoredDocument } from "../src/lib/authoring/submission.ts";
const id = "00000000-0000-4000-8000-000000000001";
test("authored submission binds verified owner and source, strips self-asserted trust and checks returned lifecycle", async () => {
  const source = readFileSync("content/skills/code-reviewer.yaml", "utf8");
  let calls = 0;
  const client = createClient<Database>("https://fixture.supabase.co", "fixture-key", {
    auth: { persistSession: false },
    global: {
      fetch: async (url, init) => {
        calls++;
        assert.match(String(url), /rpc\/submit_authored_package$/);
        const body = JSON.parse(String(init?.body));
        assert.equal(body._author, id);
        assert.equal(body._document.slug, "code-reviewer");
        assert.equal(body._document.is_published, undefined);
        return new Response(
          JSON.stringify({
            id,
            slug: "code-reviewer",
            version: "0.1.0",
            visibility: "private_draft",
            review_status: "draft",
          }),
        );
      },
    },
  });
  const result = await submitAuthoredDocument(
    client,
    id,
    source + "\nis_published: true\nreview_status: approved\n",
  );
  assert.equal(result.visibility, "private_draft");
  assert.equal(calls, 1);
  await assert.rejects(submitAuthoredDocument(client, "not-a-user", source));
  assert.equal(calls, 1);
});
