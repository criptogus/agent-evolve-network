#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/database.ts";
import { embedQuery, resolveEmbeddingConfig } from "../src/lib/search/embedding.ts";
const args = process.argv.slice(2);
const bound = Number(args[args.indexOf("--max-requests") + 1]);
if (
  !args.includes("--live") ||
  !args.includes("--max-requests") ||
  !Number.isInteger(bound) ||
  bound < 1 ||
  bound > 2000
)
  throw new Error(
    "Explicit --live --max-requests N (1..2000) required; provider charges may apply",
  );
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Private database configuration required");
const config = resolveEmbeddingConfig(process.env);
const { model } = config;
const client = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client
  .from("packages")
  .select("id,slug,name,description,long_description,latest_version")
  .eq("is_published", true)
  .eq("review_status", "approved")
  .order("slug")
  .limit(2001);
if (error || !data?.length || data.length > 2000)
  throw new Error("Missing or oversized eligible catalog; no provider calls made");
const { data: existing, error: indexError } = await client
  .from("package_embeddings")
  .select("package_id,version,model,source_sha256");
if (indexError) throw new Error("Install the semantic index migration first");
const pending = data
  .map((p) => {
    const input = [p.name, p.description, p.long_description].join("\n").slice(0, 2000);
    return { p, input, hash: createHash("sha256").update(input).digest("hex") };
  })
  .filter(
    ({ p, hash }) =>
      !existing?.some(
        (e) =>
          e.package_id === p.id &&
          e.version === p.latest_version &&
          e.model === model &&
          e.source_sha256 === hash,
      ),
  );
if (!pending.length || pending.length > bound)
  throw new Error(
    `Need ${pending.length} requests; no-op or budget overrun rejected before inference`,
  );
let completed = 0;
for (const { p, input, hash } of pending) {
  const vector = await embedQuery(input, config);
  const { error: writeError } = await client.from("package_embeddings").upsert({
    package_id: p.id,
    version: p.latest_version,
    model,
    embedding: JSON.stringify(vector),
    source_sha256: hash,
  });
  if (writeError) throw new Error("Index write failed after a provider call; no automatic retry");
  completed++;
}
console.log(JSON.stringify({ completed, model, dimensions: 1536, public_metadata_only: true }));
