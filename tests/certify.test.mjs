import { test } from "node:test";
import assert from "node:assert/strict";

import {
  badgeUrl,
  badgeValue,
  embedMarkdown,
  parseCertifyRequest,
  sha256Hex,
  verifyUrl,
  CONTENT_MAX_CHARS,
} from "../src/lib/certify/core.ts";
import { renderCertifiedBadge } from "../src/lib/badges/trust-badge.ts";

test("sha256Hex matches a known vector", async () => {
  // echo -n "abc" | sha256sum
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("parseCertifyRequest accepts a valid body and trims the name", () => {
  const r = parseCertifyRequest({
    name: "  my-skill.md  ",
    type: "guardrail",
    content: "x".repeat(50),
  });
  assert.ok(r.ok);
  assert.equal(r.value.name, "my-skill.md");
  assert.equal(r.value.type, "guardrail");
});

test("parseCertifyRequest defaults type to skill", () => {
  const r = parseCertifyRequest({ name: "a", content: "x".repeat(50) });
  assert.ok(r.ok);
  assert.equal(r.value.type, "skill");
});

test("parseCertifyRequest rejects bad input", () => {
  assert.equal(parseCertifyRequest(null).ok, false);
  assert.equal(parseCertifyRequest({ name: "", content: "x".repeat(50) }).ok, false);
  assert.equal(
    parseCertifyRequest({ name: "a", type: "agent", content: "x".repeat(50) }).ok,
    false,
  );
  assert.equal(parseCertifyRequest({ name: "a", content: "too short" }).ok, false);
  assert.equal(
    parseCertifyRequest({ name: "a", content: "x".repeat(CONTENT_MAX_CHARS + 1) }).ok,
    false,
  );
});

test("badgeValue renders letter + score", () => {
  assert.equal(badgeValue({ overall_score: 84, grade: "B — solid, minor gaps" }), "B · 84/100");
  assert.equal(badgeValue({ overall_score: 12, grade: "F — rewrite recommended" }), "F · 12/100");
});

test("urls and embed snippet are consistent", () => {
  const origin = "https://superagentskill.com";
  const id = "0b7c1234";
  assert.equal(badgeUrl(origin, id), `${origin}/api/badges/certified/${id}.svg`);
  assert.equal(verifyUrl(origin, id), `${origin}/api/public/certifications/${id}`);
  const md = embedMarkdown(origin, id);
  assert.ok(md.includes(badgeUrl(origin, id)));
  assert.ok(md.includes(verifyUrl(origin, id)));
  assert.ok(md.startsWith("[![skill audit]"));
});

test("renderCertifiedBadge renders score and gray fallback", () => {
  const ok = renderCertifiedBadge({ value: "B · 84/100", score0to100: 84 });
  assert.ok(ok.includes("<svg"));
  assert.ok(ok.includes("skill audit"));
  assert.ok(ok.includes("B · 84/100"));

  const missing = renderCertifiedBadge({ value: null, score0to100: null });
  assert.ok(missing.includes("—"));
  assert.ok(missing.includes("#586069"), "missing score must render the gray badge");
});
