#!/usr/bin/env node
/** Read-only production/CI verification. 0=pass, 1=regression, 2=incomplete. */
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("[rpc-security] Missing backend configuration.");
  process.exit(2);
}
const client = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await client.rpc("check_security_boundaries");
const expected = [
  "server_rpc_acl",
  "email_search_path",
  "rls_invoker_reads",
  "authenticated_transactions",
  "plans_explicit_public_rows",
];
if (
  error ||
  !Array.isArray(data) ||
  data.length !== expected.length ||
  expected.some(
    (name) =>
      data.filter((row) => row.check_name === name && typeof row.passed === "boolean").length !== 1,
  )
) {
  console.error("[rpc-security] Incomplete security report.", error?.message ?? "");
  process.exit(2);
}
const failed = data.filter((row) => row.passed !== true);
console.log(
  JSON.stringify(
    { checks: data, passed: data.length - failed.length, failed: failed.length },
    null,
    2,
  ),
);
process.exitCode = failed.length ? 1 : 0;
