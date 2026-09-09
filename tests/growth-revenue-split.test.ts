import { test } from "node:test";
import assert from "node:assert/strict";

const { splitRevenue, summarize } = await import("../src/lib/growth/revenue-split.ts");
const { ancestry } = await import("../src/lib/growth/lineage.ts");

const baseSale = {
  amount_cents: 10_000, currency: "usd",
  package_id: "p1", author_user_id: "A",
  source_payment_id: "ch_1",
};

test("default split: platform 15% + author 85%", () => {
  const lines = splitRevenue(baseSale);
  const s = summarize(lines);
  assert.equal(s.total, 10_000);
  assert.equal(s.by_kind.platform, 1500);
  assert.equal(s.by_kind.author, 8500);
});

test("active referral takes 10% from author", () => {
  const lines = splitRevenue({
    ...baseSale,
    referral: { referrer_user_id: "R", expires_at: new Date(Date.now() + 86400_000).toISOString(), rev_share_bps: 1000 },
  });
  const s = summarize(lines);
  assert.equal(s.by_kind.platform, 1500);
  assert.equal(s.by_kind.referral, 1000);
  assert.equal(s.by_kind.author, 7500);
});

test("expired referral does not pay out", () => {
  const lines = splitRevenue({
    ...baseSale,
    referral: { referrer_user_id: "R", expires_at: new Date(Date.now() - 1000).toISOString(), rev_share_bps: 1000 },
  });
  assert.ok(!lines.find((l) => l.kind === "referral"));
});

test("lineage upstream takes its bps before author", () => {
  const lines = splitRevenue({
    ...baseSale,
    lineage: [{ parent_package_id: "p0", upstream_user_id: "U", rev_share_bps: 500 }],
  });
  const s = summarize(lines);
  assert.equal(s.by_kind.lineage, 500);
  assert.equal(s.by_kind.author, 8000);
});

test("lineage chain pays each upstream", () => {
  const lines = splitRevenue({
    ...baseSale,
    lineage: [
      { parent_package_id: "p0", upstream_user_id: "U1", rev_share_bps: 500 },
      { parent_package_id: "pX", upstream_user_id: "U2", rev_share_bps: 250 },
    ],
  });
  const s = summarize(lines);
  assert.equal(s.by_kind.lineage, 750);
  assert.equal(s.by_kind.author, 7750);
});

test("lineage edge pointing at author is ignored", () => {
  const lines = splitRevenue({
    ...baseSale,
    lineage: [{ parent_package_id: "p0", upstream_user_id: "A", rev_share_bps: 500 }],
  });
  assert.ok(!lines.find((l) => l.kind === "lineage"));
});

test("ancestry walks upstream and stops at cycle", async () => {
  const edges = {
    c: { child_package_id: "c", parent_package_id: "b", upstream_user_id: "U1", rev_share_bps: 500 },
    b: { child_package_id: "b", parent_package_id: "a", upstream_user_id: "U2", rev_share_bps: 500 },
    a: { child_package_id: "a", parent_package_id: "c", upstream_user_id: "U3", rev_share_bps: 500 }, // cycle
  };
  const chain = await ancestry("c", async (id) => edges[id] ?? null);
  // c→b, b→a; a→c is a cycle and is dropped.
  assert.equal(chain.length, 2);
  assert.equal(chain[0].parent_package_id, "b");
  assert.equal(chain[1].parent_package_id, "a");
});
