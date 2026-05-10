import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: mine } = await supabase
      .from("packages").select("id, slug, name, type, latest_version, is_published")
      .eq("author_id", userId).order("created_at", { ascending: false });
    const { data: all } = await supabase
      .from("packages").select("id, slug, name, type, latest_version")
      .order("name", { ascending: true }).limit(200);
    return { mine: mine || [], all: all || [] };
  });
