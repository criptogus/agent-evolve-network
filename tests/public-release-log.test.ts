import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/database.ts";
import { loadPublicReleaseLog } from "../src/lib/public-release-log.ts";

const release = {
  signed_at: "2026-10-25T12:00:00Z",
  version: "1.0.0",
  content_hash: "a".repeat(64),
  signature: "s".repeat(88),
  signing_key_id: "key-fingerprint",
  signed_by: "private-user-id",
  packages: {
    slug: "example",
    name: "Example",
    is_published: true,
    review_status: "approved",
    author_id: "private-author-id",
  },
};

function clientFor(body: unknown, status = 200, inspect?: (url: URL) => void) {
  return createClient<Database>("https://example.supabase.co", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        inspect?.(new URL(String(input)));
        return new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
}

test("release log gates public approved packages in the actual Supabase request and exposes metadata only", async () => {
  let requests = 0;
  const result = await loadPublicReleaseLog(
    clientFor([release], 200, (url) => {
      requests++;
      assert.equal(url.pathname, "/rest/v1/package_releases");
      assert.equal(url.searchParams.get("packages.is_published"), "eq.true");
      assert.equal(url.searchParams.get("packages.review_status"), "eq.approved");
      assert.match(url.searchParams.get("select") ?? "", /packages!inner/);
      assert.equal(url.searchParams.get("limit"), "20");
      assert.equal(url.searchParams.get("order"), "signed_at.desc");
    }),
  );
  assert.equal(requests, 1);
  assert.equal(result.available, true);
  assert.deepEqual(result.releases, [
    {
      signed_at: release.signed_at,
      slug: "example",
      name: "Example",
      version: "1.0.0",
      content_hash: release.content_hash,
      signing_key_id: "key-fingerprint",
      signature_preview: `${"s".repeat(24)}…`,
    },
  ]);
  assert.ok(!JSON.stringify(result).includes("private-"));
});

test("release log excludes private, unapproved, unjoined and incomplete records", async () => {
  const rows = [
    { ...release, packages: { ...release.packages, is_published: false } },
    { ...release, packages: { ...release.packages, review_status: "pending" } },
    { ...release, packages: null },
    { ...release, signature: "" },
    { ...release, signed_at: "invalid" },
  ];
  const result = await loadPublicReleaseLog(clientFor(rows));
  assert.deepEqual(result, { available: true, releases: [] });
});

test("an unavailable release log is distinct from an empty successful query", async () => {
  const failed = await loadPublicReleaseLog(clientFor({ message: "private database detail" }, 403));
  assert.deepEqual(failed, { available: false, releases: [] });
  assert.deepEqual(await loadPublicReleaseLog(clientFor([])), { available: true, releases: [] });
});
