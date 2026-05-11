#!/usr/bin/env node
// Upserts every YAML in content/{skills,playbooks,souls,guardrails}/ into the
// public.packages table of the connected Supabase project.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-content-to-registry.mjs
//   bun run sync:content
//
// Idempotent: matches on slug, updates name/description/type/version/body.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { createClient } from "@supabase/supabase-js";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = ["skill", "playbook", "soul", "guardrail"];
const FOLDER = { skill: "skills", playbook: "playbooks", soul: "souls", guardrail: "guardrails" };

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const packages = [];

for (const type of TYPES) {
  const dir = join(ROOT, "content", FOLDER[type]);
  let entries;
  try { entries = readdirSync(dir); } catch { continue; }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    if (!/\.ya?ml$/i.test(entry)) continue;
    if (basename(entry).startsWith("_")) continue;
    const raw = readFileSync(full, "utf8");
    const pkg = parseYaml(raw);
    if (!pkg || pkg.type !== type) continue;
    packages.push({
      slug: pkg.slug,
      name: pkg.name,
      type: pkg.type,
      version: pkg.version,
      description: pkg.description,
      tags: pkg.tags ?? [],
      body: raw,
      is_published: true,
      source: "github:content/",
    });
  }
}

console.log(`Syncing ${packages.length} package(s)…`);

let ok = 0, fail = 0;
for (const p of packages) {
  const { error } = await supabase
    .from("packages")
    .upsert(p, { onConflict: "slug" });
  if (error) { console.error(`✗ ${p.slug}: ${error.message}`); fail++; }
  else { console.log(`✓ ${p.type}/${p.slug}`); ok++; }
}

console.log(`\nDone — ${ok} synced, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
