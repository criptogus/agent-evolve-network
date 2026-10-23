import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findCatalogOverlap } from "@/lib/marketplace/catalog-curation";
export const getCatalogCuration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error || !role.data) throw new Response("Forbidden", { status: 403 });
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabaseAdmin
        .from("packages")
        .select("slug,name,description,license,author_handle,type")
        .eq("is_published", true)
        .eq("review_status", "approved")
        .order("slug")
        .range(offset, offset + 499);
      if (error) throw new Error("Unable to inspect catalog");
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    return {
      packages: rows.length,
      candidates: findCatalogOverlap(rows),
      method:
        "Conservative lexical screening; candidates require human contract and license review.",
      generated_at: new Date().toISOString(),
    };
  });
