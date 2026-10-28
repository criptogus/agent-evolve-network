// scratch — type experiments for collection embeds
import { supabase } from "@/integrations/supabase/client";

export async function scratch() {
  // E: items -> packages, chained .in().order() + consume
  const { data: items } = await supabase
    .from("skill_collection_items")
    .select("collection_id,position,packages(slug)")
    .in("collection_id", ["x"])
    .order("position");
  const a = (items ?? []).map((i) => i.collection_id);
  const b = (items ?? []).flatMap((i) => (i.packages ? [i.packages.slug] : []));

  // H: followers -> skill_collections, chained + consume
  const { data: rows } = await supabase
    .from("skill_collection_followers")
    .select("collection_id,skill_collections(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  const c = (rows ?? []).map((row) => row.skill_collections?.is_public);

  // I: with FK hint + consume
  const { data: rows2 } = await supabase
    .from("skill_collection_followers")
    .select("collection_id,skill_collections!skill_collection_followers_collection_id_fkey(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  const d = (rows2 ?? []).map((row) => row.skill_collections?.is_public);

  // J: items with FK hint + consume
  const { data: items2 } = await supabase
    .from("skill_collection_items")
    .select("collection_id,position,packages!skill_collection_items_package_id_fkey(slug)")
    .in("collection_id", ["x"])
    .order("position");
  const e = (items2 ?? []).flatMap((i) => (i.packages ? [i.packages.slug] : []));

  // K: getPublicCollection pattern via a typed local client
  const { data: c2 } = await supabase
    .from("skill_collections")
    .select("id,slug,title,description,cover_emoji")
    .eq("slug", "x")
    .eq("is_public", true)
    .maybeSingle();
  if (!c2) return null;
  const { data: rows3 } = await supabase
    .from("skill_collection_items")
    .select("package_id,position,note,packages!inner(slug,name,description)")
    .eq("collection_id", c2.id)
    .eq("packages.is_published", true)
    .eq("packages.review_status", "approved")
    .order("position");
  const f = (rows3 ?? []).map((r) => ({ ...r, package: r.packages }));

  return [a, b, c, d, e, f];
}
