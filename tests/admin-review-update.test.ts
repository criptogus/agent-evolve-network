import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/database.ts";
import { persistReviewDecision } from "../src/lib/admin/review-update.ts";

const input = {
  slug: "review-fixture",
  status: "approved" as const,
  userId: "00000000-0000-4000-8000-000000000001",
  version: "0.1.4",
  notes: "Offline transport regression only",
};
const saved = {
  slug: input.slug,
  latest_version: input.version,
  review_status: "approved",
  is_published: true,
  reviewed_by: input.userId,
};
function client(response: unknown, status = 200, inspect?: (url: URL, init: RequestInit) => void) {
  return createClient<Database>("https://review-fixture.invalid", "test-publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: "Bearer synthetic-admin-session" },
      fetch: async (url, init) => {
        inspect?.(new URL(String(url)), init ?? {});
        return new Response(JSON.stringify(response), {
          status,
          headers: { "content-type": "application/json" },
        });
      },
    },
  });
}

test("review persistence sends the caller JWT and guards the evaluated version", async () => {
  let writes = 0;
  const db = client(saved, 200, (url, init) => {
    writes++;
    assert.equal(init.method, "PATCH");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer synthetic-admin-session");
    assert.equal(url.searchParams.get("slug"), "eq.review-fixture");
    assert.equal(url.searchParams.get("latest_version"), "eq.0.1.4");
    const body = JSON.parse(String(init.body));
    assert.equal(body.reviewed_by, input.userId);
    assert.equal(body.is_published, true);
  });
  assert.deepEqual(await persistReviewDecision(db, input), {
    ok: true,
    status: "approved",
    is_published: true,
  });
  assert.equal(writes, 1);
});

test("a publication trigger/RLS denial rejects instead of reporting approval", async () => {
  await assert.rejects(
    persistReviewDecision(
      client({ code: "42501", message: "marketplace_publish_forbidden" }, 403),
      input,
    ),
    /Review was not saved: marketplace_publish_forbidden/,
  );
});

test("no updated row cannot become a successful review", async () => {
  await assert.rejects(
    persistReviewDecision(client({ code: "PGRST116", message: "No matching version" }, 406), input),
    /Review was not saved: No matching version/,
  );
});

test("a mismatched persisted version, actor or publication flag rejects", async () => {
  for (const change of [
    { latest_version: "0.1.5" },
    { reviewed_by: null },
    { is_published: false },
    { review_status: "draft" },
  ]) {
    await assert.rejects(
      persistReviewDecision(client({ ...saved, ...change }), input),
      /expected version, status and administrator/,
    );
  }
});
