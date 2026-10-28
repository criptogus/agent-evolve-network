// scratch — type experiments for collection embeds
import { supabase } from "@/integrations/supabase/client";

export async function scratch() {
  // A: plain embed items -> packages
  await supabase.from("skill_collection_items").select("collection_id,position,packages(slug)");
  // B: items -> packages with FK hint
  await supabase.from("skill_collection_items").select("collection_id,position,packages!skill_collection_items_package_id_fkey(slug)");
  // C: followers -> skill_collections plain
  await supabase.from("skill_collection_followers").select("collection_id,skill_collections(slug,title,is_public)");
  // D: followers -> skill_collections with FK hint
  await supabase.from("skill_collection_followers").select("collection_id,skill_collections!skill_collection_followers_collection_id_fkey(slug,title,is_public)");
}
