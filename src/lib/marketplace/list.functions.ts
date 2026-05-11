import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MarketplaceItem = {
  id: string;
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  description: string;
  author_handle: string;
  author_verified: boolean;
  install_count: number;
  latest_version: string;
  vertical: string | null;
  created_at: string;
  price_credits: number;
};

export const listMarketplace = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: MarketplaceItem[]; verticals: string[] }> => {
    const { data: pkgs, error } = await supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, author_handle, author_verified, install_count, latest_version, created_at, price_credits"
      )
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Response(error.message, { status: 500 });

    const ids = (pkgs ?? []).map((p) => p.id);
    let verticalByPkg = new Map<string, string | null>();
    if (ids.length) {
      const { data: vers } = await supabaseAdmin
        .from("package_versions")
        .select("package_id, version, rules")
        .in("package_id", ids);
      const latestByPkg = new Map((pkgs ?? []).map((p) => [p.id, p.latest_version]));
      for (const v of vers ?? []) {
        if (v.version !== latestByPkg.get(v.package_id)) continue;
        const rules = (v.rules ?? {}) as Record<string, unknown>;
        const vertical =
          (typeof rules.vertical === "string" && rules.vertical) ||
          (typeof rules.category === "string" && rules.category) ||
          (typeof rules.domain === "string" && rules.domain) ||
          null;
        verticalByPkg.set(v.package_id, vertical || null);
      }
    }

    const items: MarketplaceItem[] = (pkgs ?? []).map((p) => ({
      ...p,
      type: p.type as MarketplaceItem["type"],
      vertical: verticalByPkg.get(p.id) ?? null,
      price_credits: p.price_credits ?? 0,
    }));

    const vs = new Set<string>();
    for (const it of items) if (it.vertical) vs.add(it.vertical);
    return { items, verticals: Array.from(vs).sort() };
  }
);

