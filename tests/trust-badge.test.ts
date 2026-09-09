import { test } from "node:test";
import assert from "node:assert/strict";

const { renderTrustBadge, renderAdversarialBadge } = await import("../src/lib/badges/trust-badge.ts");

test("renders SVG with score percentage", () => {
  const svg = renderTrustBadge({ slug: "code-reviewer", score: 0.87 });
  assert.match(svg, /<svg /);
  assert.match(svg, /87%/);
  assert.match(svg, /trust score/);
});

test("missing score renders gray placeholder", () => {
  const svg = renderTrustBadge({ slug: "x", score: null });
  assert.match(svg, /—/);
  assert.match(svg, /#586069/);
});

test("color reflects score buckets", () => {
  const high = renderTrustBadge({ slug: "x", score: 0.9 });
  const low = renderTrustBadge({ slug: "x", score: 0.2 });
  assert.match(high, /#2ea043/);
  assert.match(low, /#cf222e/);
});

test("escapes user input in label", () => {
  const svg = renderTrustBadge({ slug: "x", score: 0.5, label: "<script>x</script>" });
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

test("adversarial badge includes vertical", () => {
  const svg = renderAdversarialBadge({ vertical: "security", pass_rate: 0.95 });
  assert.match(svg, /adversarial:security/);
  assert.match(svg, /95%/);
});
