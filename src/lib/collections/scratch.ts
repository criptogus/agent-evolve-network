// scratch — type experiments for collection embeds
import { supabase } from "@/integrations/supabase/client";

export async function scratch() {
  // E: items -> packages, chained .in().order()
  await supabase
    .from("skill_collection_items")
    .select("collection_id,position,packages(slug)")
    .in("collection_id", ["x"])
    .order("position");
  // F: items -> packages, chained .eq() only
  await supabase
    .from("skill_collection_items")
    .select("collection_id,position,packages(slug)")
    .eq("collection_id", "x");
  // G: items -> packages !inner, chained .eq().order()
  await supabase
    .from("skill_collection_items")
    .select("package_id,position,note,packages!inner(slug,name,description)")
    .eq("collection_id", "x")
    .order("position");
  // H: followers -> skill_collections, chained .eq().order().limit()
  await supabase
    .from("skill_collection_followers")
    .select("collection_id,skill_collections(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  // I: followers -> skill_collections with FK hint, chained
  await supabase
    .from("skill_collection_followers")
    .select("collection_id,skill_collections!skill_collection_followers_collection_id_fkey(slug,title,is_public)")
    .eq("user_id", "x")
    .order("followed_at", { ascending: false })
    .limit(200);
  // J: items -> packages with FK hint, chained
  await supabase
    .from("skill_collection_items")
    .select("collection_id,position,packages!skill_collection_items_package_id_fkey(slug)")
    .in("collection_id", ["x"])
    .order("position");
}
