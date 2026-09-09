#!/usr/bin/env node
/**
 * Pre-deploy public-access verification.
 *
 * Uses the anonymous (publishable) key — exactly what an unauthenticated
 * visitor of the site has — and asks every public-schema table for a row
 * count. Any table that returns rows and is NOT listed in
 * `security/public-read-allowlist.json` is a policy regression and fails
 * the build.
 *
 * Run via: `npm run check:public-access`
 *
 * Exit codes:
 *   0 — no unexpected public exposure
 *   1 — one or more tables leak rows to the anon role
 *   2 — configuration / connectivity error
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[check-public-access] Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY env vars.",
  );
  process.exit(2);
}

const allowlist = (() => {
  try {
    const raw = JSON.parse(
      readFileSync(new URL("../security/public-read-allowlist.json", import.meta.url), "utf8"),
    );
    return raw.tables ?? {};
  } catch (err) {
    console.error("[check-public-access] Cannot read allowlist:", err.message);
    process.exit(2);
  }
})();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const { data: coverage, error: rpcError } = await supabase.rpc("check_rls_coverage");

if (rpcError) {
  console.error("[check-public-access] RPC error:", rpcError.message);
  process.exit(2);
}

const tables = (coverage ?? []).map((r) => r.table_name).sort();
if (tables.length === 0) {
  console.error("[check-public-access] No tables returned by check_rls_coverage().");
  process.exit(2);
}

const exposed = [];
const allowedSeen = [];
const emptyAllowed = [];

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { head: true, count: "exact" });

  // A denied policy returns 0 rows (or a permission error) — both are fine.
  if (error) continue;
  const rows = count ?? 0;
  const isAllowed = Object.hasOwn(allowlist, table);

  if (rows > 0 && !isAllowed) exposed.push({ table, rows });
  else if (rows > 0) allowedSeen.push(table);
  else if (isAllowed) emptyAllowed.push(table);
}

console.log(
  `[check-public-access] Probed ${tables.length} public tables with the anon key.`,
);
if (allowedSeen.length) {
  console.log(
    `[check-public-access] Intentionally public (allowlisted): ${allowedSeen.join(", ")}`,
  );
}
for (const table of emptyAllowed) {
  console.log(
    `[check-public-access] note: "${table}" is allowlisted but returns no rows to anon — remove it from the allowlist if that is now permanent.`,
  );
}

const unknownAllowlisted = Object.keys(allowlist).filter((t) => !tables.includes(t));
for (const table of unknownAllowlisted) {
  console.log(
    `[check-public-access] note: allowlisted table "${table}" no longer exists.`,
  );
}

if (exposed.length === 0) {
  console.log("[check-public-access] ✅ No unexpected public data exposure.");
  process.exit(0);
}

console.error(
  `[check-public-access] ❌ ${exposed.length} table(s) leak rows to unauthenticated visitors:`,
);
for (const { table, rows } of exposed) {
  console.error(`  - ${table}: ${rows} row(s) readable by the anon role`);
}
console.error(
  "\nFix by scoping the SELECT policy to `authenticated` / `auth.uid()`, or — if the\n" +
    "exposure is intentional — add the table to security/public-read-allowlist.json\n" +
    "with a written justification.",
);
process.exit(1);
