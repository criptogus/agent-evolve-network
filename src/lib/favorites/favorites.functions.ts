import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StarState = {
  packageId: string | null;
  starred: boolean;
  star_count: number;
};

export type StarredPackage = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  latest_version: string;
  star_count: number;
  starred_at: string;
};

async function packageBySlug(
  slug: string,
): Promise<{ id: string; star_count: number } | null> {
  const { data } = await supabaseAdmin
    .from("packages")
    .select("id, star_count")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id: string; star_count: number } | null) ?? null;
}

/** Star/unstar a package. Returns the resulting state. */
export const toggleStar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { slug?: string };
    if (!o?.slug) throw new Error("slug required");
    return { slug: o.slug };
  })
  .handler(async ({ data, context }): Promise<StarState> => {
    const pkg = await packageBySlug(data.slug);
    if (!pkg) throw new Response("PACKAGE_NOT_FOUND", { status: 404 });

    const db = context.supabase as any;
    const { data: existing } = await db
      .from("package_stars")
      .select("package_id")
      .eq("user_id", context.userId)
      .eq("package_id", pkg.id)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("package_stars")
        .delete()
        .eq("user_id", context.userId)
        .eq("package_id", pkg.id);
      if (error) throw new Response(error.message, { status: 500 });
    } else {
      const { error } = await db
        .from("package_stars")
        .insert({ user_id: context.userId, package_id: pkg.id });
      // Ignore duplicate-key races; anything else is a real error.
      if (error && error.code !== "23505") {
        throw new Response(error.message, { status: 500 });
      }
    }

    const fresh = await packageBySlug(data.slug);
    return {
      packageId: pkg.id,
      starred: !existing,
      star_count: fresh?.star_count ?? pkg.star_count,
    };
  });

/** Whether the current user has starred a package, plus the public count. */
export const isStarred = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { slug?: string };
    if (!o?.slug) throw new Error("slug required");
    return { slug: o.slug };
  })
  .handler(async ({ data, context }): Promise<StarState> => {
    const pkg = await packageBySlug(data.slug);
    if (!pkg) return { packageId: null, starred: false, star_count: 0 };
    const db = context.supabase as any;
    const { data: row } = await db
      .from("package_stars")
      .select("package_id")
      .eq("user_id", context.userId)
      .eq("package_id", pkg.id)
      .maybeSingle();
    return { packageId: pkg.id, starred: !!row, star_count: pkg.star_count };
  });

/** All packages starred by the current user, most recent first. */
export const getMyStars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ packages: StarredPackage[] }> => {
    const db = context.supabase as any;
    const { data: stars, error } = await db
      .from("package_stars")
      .select("package_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });

    const rows = (stars ?? []) as { package_id: string; created_at: string }[];
    if (rows.length === 0) return { packages: [] };

    const { data: pkgs, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, slug, name, type, description, latest_version, star_count")
      .in("id", rows.map((r) => r.package_id));
    if (pkgErr) throw new Response(pkgErr.message, { status: 500 });

    const map = new Map(
      ((pkgs ?? []) as Omit<StarredPackage, "starred_at">[]).map((p) => [p.id, p]),
    );
    const packages: StarredPackage[] = rows.flatMap((r) => {
      const p = map.get(r.package_id);
      return p ? [{ ...p, starred_at: r.created_at }] : [];
    });
    return { packages };
  });
