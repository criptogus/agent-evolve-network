import test from "node:test";
import assert from "node:assert/strict";
import { assertMatchFrozenSourcePath } from "../src/lib/match/frozen-sources.ts";
test("frozen sources include the exact private cache migration and normal runtime sources", () => {
  for (const path of [
    "supabase/migrations/20261025143000_agent_match_selection_cache.sql",
    "src/lib/match/jev-persistent-cache.server.ts",
    "src/integrations/supabase/platform-schema.ts",
    "scripts/evaluate-agent-match-comparison.ts",
    "package.json",
    "package-lock.json",
  ])
    assert.doesNotThrow(() => assertMatchFrozenSourcePath(path));
});
test("storage binding never permits other SQL, traversal or arbitrary script reads", () => {
  for (const path of [
    "supabase/migrations/other.sql",
    "supabase/migrations/../secret.sql",
    "src/../secrets.ts",
    "/private/key.ts",
    "scripts/arbitrary.ts",
    "../package.json",
    "src/path.ts\n",
    "src/encoded%2fsecret.ts",
  ])
    assert.throws(() => assertMatchFrozenSourcePath(path));
});
