import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CollectionAction } from "./contract";
import { toJson } from "../json";
import { z } from "zod";
export const manageCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CollectionAction.parse(data))
  .handler(async ({ data, context }) => {
    if (data.action === "save" && new Set(data.packages).size !== data.packages.length)
      throw new Error("Duplicate packages");
    const { data: result, error } = await context.supabase.rpc("manage_collection", {
      _payload: toJson(data),
    });
    if (error)
      throw new Error("Collection action rejected; check ownership and public package slugs");
    return z.object({ id: z.string().uuid(), slug: z.string().optional() }).parse(result);
  });
export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("skill_collections")
      .select("id,slug,title,description,is_public")
      .eq("curator_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Collections could not be loaded");
    const ids = (data ?? []).map((c) => c.id);
    const { data: items, error: itemError } = ids.length
      ? await context.supabase
          .from("skill_collection_items")
          .select("collection_id,position,packages(slug)")
          .in("collection_id", ids)
          .order("position")
      : { data: [], error: null };
    if (itemError) throw new Error("Collection items could not be loaded");
    return (data ?? []).map((c) => ({
      ...c,
      packages: (items ?? [])
        .filter((i) => i.collection_id === c.id)
        .flatMap((i) => (i.packages ? [i.packages.slug] : [])),
    }));
  });
export const collectionFollowState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("skill_collection_followers")
      .select("collection_id")
      .eq("collection_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Follow state unavailable");
    return !!row;
  });
export const listPublicCollections = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ page: z.number().int().min(0).max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("skill_collections")
      .select("id,slug,title,description")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(data.page * 24, data.page * 24 + 23);
    if (error) throw new Error("Public collections are unavailable");
    return rows ?? [];
  });
export const getPublicCollection = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c, error } = await supabaseAdmin
      .from("skill_collections")
      .select("id,slug,title,description,cover_emoji")
      .eq("slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error("Collection is unavailable");
    if (!c) return null;
    const { data: rows, error: itemError } = await supabaseAdmin
      .from("skill_collection_items")
      .select("package_id,position,note,packages!inner(slug,name,description)")
      .eq("collection_id", c.id)
      .eq("packages.is_published", true)
      .eq("packages.review_status", "approved")
      .order("position");
    if (itemError) throw new Error("Collection items are unavailable");
    return { collection: c, items: (rows ?? []).map((r) => ({ ...r, package: r.packages })) };
  });

export const listFollowedCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("skill_collection_followers")
      .select("collection_id,skill_collections(slug,title,is_public)")
      .eq("user_id", context.userId)
      .order("followed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Followed collections are unavailable");
    return (data ?? []).map((row) => ({
      id: row.collection_id,
      collection: row.skill_collections?.is_public
        ? { slug: row.skill_collections.slug, title: row.skill_collections.title }
        : null,
    }));
  });
