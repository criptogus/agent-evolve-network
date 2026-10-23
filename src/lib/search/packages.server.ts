import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

const supabaseAdmin = _supabaseAdmin as any;

export type PackageSearchResult = {
  slug: string;
  type: string;
  score: number;
  snippet: string;
  name: string;
  latest_version: string;
};

export type PackageSearchParams = {
  q: string;
  type?: string | null;
  limit: number;
  offset: number;
};

/** Postgres error codes indicating the RPC hasn't been deployed yet. */
const MISSING_FUNCTION_CODES = new Set(["42883", "PGRST202", "PGRST302"]);

/**
 * Server-side package search. Uses the `search_packages` RPC (weighted
 * full-text search + install-count boost, published-only, SECURITY DEFINER).
 * Falls back to the legacy ILIKE query when the RPC doesn't exist yet, so
 * app deploys are safe regardless of migration ordering.
 */
export async function searchPackages(params: PackageSearchParams): Promise<PackageSearchResult[]> {
  const { q, type, limit, offset } = params;

  const { data, error } = await supabaseAdmin.rpc("search_packages", {
    query: q,
    package_type: type || null,
    limit_count: limit,
    offset_count: offset,
  });

  if (!error) {
    return ((data ?? []) as any[]).map((r) => ({
      slug: r.slug,
      type: r.type,
      score: typeof r.rank === "number" ? r.rank : (r.install_count ?? 0),
      snippet: r.description ?? "",
      name: r.name,
      latest_version: r.latest_version,
    }));
  }

  if (!MISSING_FUNCTION_CODES.has(error.code ?? "")) {
    throw new Error(`search_packages rpc failed: ${error.message}`);
  }

  // Fallback: RPC not deployed yet — legacy ILIKE search.
  const sanitized = q.replace(/[%,()]/g, " ").trim();
  if (!sanitized) return [];

  let query = supabaseAdmin
    .from("packages")
    .select("slug,name,type,description,latest_version,install_count")
    .eq("is_published", true)
    .eq("review_status", "approved")
    .or(
      `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,long_description.ilike.%${sanitized}%`,
    )
    .order("install_count", { ascending: false })
    .range(offset, offset + limit - 1);
  if (type) query = query.eq("type", type);

  const { data: rows, error: fbError } = await query;
  if (fbError) throw new Error(`package search fallback failed: ${fbError.message}`);

  return ((rows ?? []) as any[]).map((r) => ({
    slug: r.slug,
    type: r.type,
    score: r.install_count ?? 0,
    snippet: r.description ?? "",
    name: r.name,
    latest_version: r.latest_version,
  }));
}
