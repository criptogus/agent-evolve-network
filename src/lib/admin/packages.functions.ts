import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware";

export const listAllPackages = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().max(120).optional(), kind: z.string().optional() }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    let q = supabase
      .from("packages")
      .select("id, slug, name, type, description, is_published, install_count, latest_version, source_kind, source_ref, author_handle, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.kind) q = q.eq("type", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return { packages: rows ?? [] };
  });

export const setPackagePublished = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("packages")
      .update({ is_published: data.published })
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    await supabase.from("package_versions").delete().eq("package_id", data.id);
    const { error } = await supabase.from("packages").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
