import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import {
  researchStateOfTheArt,
  customizeItem,
  type CustomizedItem,
  type PackItemSource,
} from "./pipeline.server";

export type PackSummary = {
  id: string;
  slug: string;
  name: string;
  theme: string;
  description: string;
  cover_emoji: string;
  price_credits: number;
  install_count: number;
  item_count: number;
};

export type PackDetail = {
  pack: {
    id: string;
    slug: string;
    name: string;
    theme: string;
    description: string;
    long_description: string | null;
    cover_emoji: string;
    price_credits: number;
    install_count: number;
    author_handle: string;
    latest_version: string;
  };
  items: Array<{
    package_id: string;
    slug: string;
    name: string;
    type: string;
    description: string;
    role: string;
  }>;
  owned: boolean;
};

const packsListCache = createTtlCache<{ packs: PackSummary[] }>(5 * 60 * 1000, { max: 4 });
const packDetailCache = createTtlCache<PackDetail | null>(5 * 60 * 1000, { max: 500 });

export const listPacks = createServerFn({ method: "GET" }).handler(async (): Promise<{ packs: PackSummary[] }> => {
  return packsListCache.getOrLoad("all", async () => {
    const { data: rows, error } = await supabaseAdmin
      .from("packs")
      .select("id,slug,name,theme,description,cover_emoji,price_credits,install_count, pack_items(count)")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    const packs = (rows ?? []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      theme: r.theme,
      description: r.description,
      cover_emoji: r.cover_emoji,
      price_credits: r.price_credits,
      install_count: r.install_count,
      item_count: r.pack_items?.[0]?.count ?? 0,
    }));
    return { packs };
  });
});

const SlugInput = z.object({ slug: z.string().min(1) });

export const getPack = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SlugInput.parse(d))
  .handler(async ({ data }): Promise<PackDetail | null> => {
    return packDetailCache.getOrLoad(data.slug, async () => {
      const { data: row, error } = await supabaseAdmin.rpc("get_pack_with_items", { _slug: data.slug });
      if (error) throw new Response(error.message, { status: 500 });
      return (row as PackDetail | null) ?? null;
    });
  });

const PackIdInput = z.object({ pack_id: z.string().uuid() });

export const purchasePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PackIdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("purchase_pack", { _pack_id: data.pack_id });
    if (error) {
      const known: Record<string, string> = {
        INSUFFICIENT_CREDITS: "Not enough credits. Top up to complete this purchase.",
        ALREADY_OWNED: "You already own this pack.",
        CANNOT_BUY_OWN_PACK: "You can't buy your own pack.",
        PACK_NOT_AVAILABLE: "This pack isn't available right now.",
        PACK_NOT_FOUND: "Pack not found.",
        NOT_AUTHENTICATED: "Sign in to buy packs.",
      };
      const m = Object.keys(known).find((k) => error.message.includes(k));
      throw new Response(m ? known[m] : error.message, { status: 400 });
    }
    return result;
  });

const CustomizeInput = z.object({
  pack_id: z.string().uuid(),
  brief: z.string().min(20).max(2000),
  niche: z.string().max(200).optional(),
  audience: z.string().max(300).optional(),
  voice: z.string().max(200).optional(),
});

export const startCustomization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CustomizeInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Must own the pack
    const { data: owned } = await supabase
      .from("pack_purchases")
      .select("id")
      .eq("buyer_id", userId)
      .eq("pack_id", data.pack_id)
      .maybeSingle();
    if (!owned) throw new Response("You must purchase this pack before customizing it.", { status: 403 });

    const { data: row, error } = await supabase
      .from("pack_customizations")
      .insert({
        user_id: userId,
        pack_id: data.pack_id,
        brief: data.brief,
        niche: data.niche ?? null,
        audience: data.audience ?? null,
        voice: data.voice ?? null,
        status: "queued",
      })
      .select("id")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return { customization_id: row.id };
  });

const RunInput = z.object({ customization_id: z.string().uuid() });

export const runCustomization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: cust, error: cErr } = await supabase
      .from("pack_customizations")
      .select("*")
      .eq("id", data.customization_id)
      .eq("user_id", userId)
      .single();
    if (cErr || !cust) throw new Response("Customization not found", { status: 404 });
    if (cust.status === "ready") return { status: "ready" as const };

    // Load pack + items + latest version content
    const { data: pack } = await supabaseAdmin.from("packs").select("*").eq("id", cust.pack_id).single();
    if (!pack) throw new Response("Pack not found", { status: 404 });

    const { data: items } = await supabaseAdmin
      .from("pack_items")
      .select("role, sort_order, package:packages(id, slug, name, type, description, latest_version)")
      .eq("pack_id", cust.pack_id)
      .order("sort_order", { ascending: true });

    const sources: PackItemSource[] = [];
    for (const it of items ?? []) {
      const pkg = (it as any).package;
      if (!pkg) continue;
      const { data: ver } = await supabaseAdmin
        .from("package_versions")
        .select("system_prompt, rules, examples")
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      sources.push({
        package_id: pkg.id,
        slug: pkg.slug,
        name: pkg.name,
        type: pkg.type,
        description: pkg.description,
        role: (it as any).role,
        system_prompt: ver?.system_prompt ?? "",
        rules: ver?.rules ?? {},
        examples: ver?.examples ?? [],
      });
    }

    try {
      await supabaseAdmin
        .from("pack_customizations")
        .update({ status: "researching" })
        .eq("id", cust.id);

      const research = await researchStateOfTheArt({
        packName: pack.name,
        packTheme: pack.theme,
        brief: cust.brief,
        niche: cust.niche ?? undefined,
        audience: cust.audience ?? undefined,
      });

      await supabaseAdmin
        .from("pack_customizations")
        .update({
          status: "customizing",
          research_summary: research.summary,
          research_sources: research.sources as any,
        })
        .eq("id", cust.id);

      const customized: CustomizedItem[] = [];
      // Customize sequentially to respect rate limits
      for (const src of sources) {
        const c = await customizeItem({
          research,
          item: src,
          brief: cust.brief,
          niche: cust.niche ?? undefined,
          audience: cust.audience ?? undefined,
          voice: cust.voice ?? undefined,
        });
        customized.push(c);
        await supabaseAdmin
          .from("pack_customizations")
          .update({ items: customized as any })
          .eq("id", cust.id);
      }

      await supabaseAdmin
        .from("pack_customizations")
        .update({ status: "ready" })
        .eq("id", cust.id);

      return { status: "ready" as const, count: customized.length };
    } catch (e: any) {
      await supabaseAdmin
        .from("pack_customizations")
        .update({ status: "error", error: String(e?.message || e) })
        .eq("id", cust.id);
      throw new Response(`Customization failed: ${e?.message || e}`, { status: 500 });
    }
  });

const GetCustInput = z.object({ customization_id: z.string().uuid() });

export const getCustomization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GetCustInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("pack_customizations")
      .select("*")
      .eq("id", data.customization_id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Response("Not found", { status: 404 });
    return row;
  });

export const listMyCustomizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pack_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("pack_customizations")
      .select("id, pack_id, status, brief, niche, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data.pack_id) q = q.eq("pack_id", data.pack_id);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return { customizations: rows ?? [] };
  });
