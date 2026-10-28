// scratch — type experiments for collection embeds
import { createClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "@/integrations/supabase/types";
import type { OptionalTables, OptionalViews } from "@/integrations/supabase/optional-schema";
import type { PlatformTables, PlatformFunctions } from "@/integrations/supabase/platform-schema";

type GT = GeneratedDatabase["public"]["Tables"];
type GV = GeneratedDatabase["public"]["Views"];
type GF = GeneratedDatabase["public"]["Functions"];

// Flatten intersections into single object types so embed parsing can traverse them.
type FlatTables = { [K in keyof (GT & OptionalTables & PlatformTables)]: (GT & OptionalTables & PlatformTables)[K] };
type FlatViews = { [K in keyof (GV & OptionalViews)]: (GV & OptionalViews)[K] };
type FlatFunctions = { [K in keyof (GF & PlatformFunctions)]: (GF & PlatformFunctions)[K] };

type FlatDatabase = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Views" | "Functions"> & {
    Tables: FlatTables;
    Views: FlatViews;
    Functions: FlatFunctions;
  };
};

const flat = createClient<FlatDatabase>("https://example.com", "anon");

export async function scratch() {
  // N: flattened composed types, items -> packages + consume
  const { data: items } = await flat
    .from("skill_collection_items")
    .select("collection_id,position,packages(slug)")
    .in("collection_id", ["x"])
    .order("position");
  const a = (items ?? []).flatMap((i) => (i.packages ? [i.packages.slug] : []));

  // O: flattened composed types, followers -> skill_collections + consume
  const { data: rows } = await flat
    .from("skill_collection_followers")
    .select("collection_id,skill_collections(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  const b = (rows ?? []).map((row) => row.skill_collections?.is_public);

  // P: flattened composed types, getPublicCollection pattern + consume
  const { data: c2 } = await flat
    .from("skill_collections")
    .select("id,slug,title,description,cover_emoji")
    .eq("slug", "x")
    .eq("is_public", true)
    .maybeSingle();
  if (!c2) return null;
  const { data: rows3 } = await flat
    .from("skill_collection_items")
    .select("package_id,position,note,packages!inner(slug,name,description)")
    .eq("collection_id", c2.id)
    .eq("packages.is_published", true)
    .eq("packages.review_status", "approved")
    .order("position");
  const f = (rows3 ?? []).map((r) => ({ ...r, package: r.packages }));

  return [a, b, f];
}
