import { test } from "node:test";
import assert from "node:assert/strict";

const { detectRugPull, packageContentHash, canonicalJson } = await import(
  "../src/lib/marketplace/rug-pull.ts"
);

const base = {
  slug: "code-reviewer",
  version: "1.2.0",
  content_sha256: packageContentHash({ slug: "code-reviewer", version: "1.2.0", prompt: "review" }),
  publisher: "alice",
  tools: ["read_file", "post_comment"],
};

test("rug-pull: unchanged package produces no findings", () => {
  const r = detectRugPull(base, { ...base });
  assert.equal(r.rug_pull, false);
  assert.deepEqual(r.findings, []);
});

test("rug-pull: content changed under the SAME version is critical", () => {
  const r = detectRugPull(base, {
    ...base,
    content_sha256: packageContentHash({ prompt: "exfiltrate ~/.ssh" }),
  });
  assert.equal(r.rug_pull, true);
  assert.equal(r.findings[0].kind, "CONTENT_CHANGED_SAME_VERSION");
  assert.equal(r.findings[0].severity, "critical");
});

test("rug-pull: a new version with new content is a release, not a rug pull", () => {
  const r = detectRugPull(base, {
    ...base,
    version: "1.3.0",
    content_sha256: packageContentHash({ prompt: "improved review" }),
  });
  assert.equal(r.rug_pull, false);
});

test("rug-pull: silently added MCP tool under the same version is high", () => {
  const r = detectRugPull(base, { ...base, tools: ["read_file", "post_comment", "shell_exec"] });
  assert.equal(r.rug_pull, true);
  const f = r.findings.find((x) => x.kind === "TOOL_SET_CHANGED");
  assert.ok(f);
  assert.match(f.detail, /shell_exec/);
  // Order and duplicates are not changes.
  const reordered = detectRugPull(base, { ...base, tools: ["post_comment", "read_file", "read_file"] });
  assert.equal(reordered.rug_pull, false);
});

test("rug-pull: publisher change and version rollback are flagged", () => {
  const pub = detectRugPull(base, { ...base, publisher: "mallory" });
  assert.ok(pub.findings.some((f) => f.kind === "PUBLISHER_CHANGED"));

  const rollback = detectRugPull(base, {
    ...base,
    version: "1.1.9",
    content_sha256: packageContentHash({ prompt: "old" }),
  });
  assert.ok(rollback.findings.some((f) => f.kind === "VERSION_ROLLBACK"));
});

test("canonicalJson: key order does not change the hash", () => {
  assert.equal(canonicalJson({ b: 1, a: { y: 2, x: 3 } }), canonicalJson({ a: { x: 3, y: 2 }, b: 1 }));
  assert.equal(packageContentHash({ a: 1, b: 2 }), packageContentHash({ b: 2, a: 1 }));
});
