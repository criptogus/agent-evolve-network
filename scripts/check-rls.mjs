#!/usr/bin/env node
/**
 * Pre-deploy RLS coverage check.
 *
 * Calls the `public.check_rls_coverage()` SQL function and exits with
 * a non-zero status code if any public table has RLS disabled or has
 * RLS enabled but no policies defined.
 *
 * Run via: `npm run check:rls`
 *
 * Allowlist tables intentionally without policies via env:
 *   RLS_ALLOWLIST="table_a,table_b"
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[check-rls] Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY env vars.",
  );
  process.exit(2);
}

const FILE_ALLOWLIST = (() => {
  try {
    const raw = JSON.parse(
      readFileSync(
        new URL("../security/rls-no-policy-allowlist.json", import.meta.url),
        "utf8",
      ),
    );
    return Object.keys(raw.tables ?? {});
  } catch {
    return [];
  }
})();

const ALLOWLIST = new Set([
  ...FILE_ALLOWLIST,
  ...(process.env.RLS_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);



const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.rpc("check_rls_coverage");

if (error) {
  console.error("[check-rls] RPC error:", error.message);
  process.exit(2);
}

const rows = data ?? [];
// An allowlist entry only excuses a deny-all table (RLS on, no policies).
// RLS being DISABLED is never allowlistable — that exposes every row.
const problems = rows.filter(
  (r) =>
    r.issue !== "OK" &&
    (r.issue === "RLS_DISABLED" || !ALLOWLIST.has(r.table_name)),
);

const total = rows.length;
const ok = rows.filter((r) => r.issue === "OK").length;

console.log(`[check-rls] Audited ${total} public tables — ${ok} OK.`);

if (problems.length === 0) {
  console.log("[check-rls] ✅ All tables have RLS enabled with policies.");
  process.exit(0);
}

console.error(`[check-rls] ❌ Found ${problems.length} table(s) with issues:`);
for (const p of problems) {
  const reason =
    p.issue === "RLS_DISABLED"
      ? "RLS is DISABLED"
      : `RLS enabled but ${p.policy_count} policies`;
  console.error(`  - ${p.table_name}: ${reason}`);
}
console.error(
  "\nFix by adding `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and " +
    "CREATE POLICY statements, or allowlist intentional cases via " +
    "RLS_ALLOWLIST env var.",
);
process.exit(1);
