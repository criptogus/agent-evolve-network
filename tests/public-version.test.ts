import test from "node:test";
import assert from "node:assert/strict";
import { versionResults } from "../scripts/check-public-version.mjs";
const canonical = "https://project.example",
  alias = "https://alias.example";
test("platform probe accepts the exact version and only the explicit canonical redirect", () => {
  const r = versionResults("0.7.0", canonical, alias, [
    { status: 200, data: { version: "0.7.0" } },
    { status: 302, location: canonical + "/api/public/version" },
  ]);
  assert.ok(r.every((x) => x.passed));
  assert.equal(r[1].canonical_redirect, true);
  assert.ok(
    versionResults("0.7.0", canonical, alias, [
      { status: 200, data: { version: "0.7.0" } },
      { status: 200, data: { version: "0.7.0" } },
    ]).every((x) => x.passed),
  );
});
test("platform probe rejects stale versions, foreign redirects and unknown observations", () => {
  for (const location of [
    "https://foreign.example/api/public/version",
    canonical + "/api/public/version?token=not-allowed",
    canonical + "/login",
  ]) {
    const r = versionResults("0.7.0", canonical, alias, [
      { status: 200, data: { version: "0.7.0" } },
      { status: 302, location },
    ]);
    assert.equal(r[1].passed, false);
  }
  assert.ok(
    versionResults("0.7.0", canonical, alias, [
      { status: 200, data: { version: "0.6.10" } },
      { status: 302, location: canonical + "/api/public/version" },
    ]).every((x) => !x.passed),
  );
  assert.ok(
    versionResults("0.7.0", canonical, alias, [
      { status: null, error: "unknown" },
      { status: 200, data: { version: "0.7.0" } },
    ]).every((x) => !x.passed),
  );
});
