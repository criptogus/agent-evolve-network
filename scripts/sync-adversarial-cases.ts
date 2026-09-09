#!/usr/bin/env node
// Syncs content/adversarial/<vertical>/<id>.yaml into public.adversarial_cases.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { createClient } from "@supabase/supabase-js";

const ROOT = new URL("..", import.meta.url).pathname;
const ADV_ROOT = join(ROOT, "content/adversarial");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let upserts = 0;
const seenIds = [];
const verticals = readdirSync(ADV_ROOT);
for (const vertical of verticals) {
  const dir = join(ADV_ROOT, vertical);
  if (!statSync(dir).isDirectory()) continue;
  for (const entry of readdirSync(dir)) {
    if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
    const kase = parseYaml(readFileSync(join(dir, entry), "utf8"));
    seenIds.push(kase.id);
    const row = {
      case_id: kase.id,
      vertical: kase.vertical,
      category: kase.category,
      severity: kase.severity,
      target_package_type: kase.target.package_type,
      target_package_slugs: kase.target.package_slugs ?? [],
      target_tags: kase.target.tags ?? [],
      input: kase.input,
      context: kase.context ?? null,
      expectations: kase.expectations,
      references_: kase.references ?? [],
      tags: kase.tags ?? [],
      authors: kase.authors,
      license: kase.license ?? "Proprietary",
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("adversarial_cases")
      .upsert(row, { onConflict: "case_id" });
    if (error) {
      console.error(`✗ upsert failed for ${kase.id}: ${error.message}`);
      process.exit(1);
    }
    upserts++;
  }
}

// Deactivate cases removed from disk.
const { error: deactivateErr } = await supabase
  .from("adversarial_cases")
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .not("case_id", "in", `(${seenIds.map((s) => `"${s}"`).join(",") || '""'})`);
if (deactivateErr) {
  console.error(`✗ deactivation failed: ${deactivateErr.message}`);
}

console.log(`✓ synced ${upserts} adversarial case(s).`);
