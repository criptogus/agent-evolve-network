// scratch — type experiments for collection embeds
import { createClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "@/integrations/supabase/types";

const raw = createClient<GeneratedDatabase>("https://example.com", "anon");

export async function scratch() {
  // L: raw generated types, items -> packages + consume
  const { data: items } = await raw
    .from("skill_collection_items")
    .select("collection_id,position,packages(slug)")
    .in("collection_id", ["x"])
    .order("position");
  const a = (items ?? []).flatMap((i) => (i.packages ? [i.packages.slug] : []));

  // M: raw generated types, followers -> skill_collections + consume
  const { data: rows } = await raw
    .from("skill_collection_followers")
    .select("collection_id,skill_collections(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  const b = (rows ?? []).map((row) => row.skill_collections?.is_public);

  return [a, b];
}
