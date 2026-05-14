import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { z } from "zod";

export type DiscoverType = "skill" | "playbook" | "soul" | "guardrail";

export interface DiscoverItem {
  id: string;
  slug: string;
  name: string;
  type: DiscoverType;
  description: string;
  author_handle: string;
  author_verified: boolean;
  install_count: number;
  latest_version: string;
  vertical: string | null;
  category: string;
  price_credits: number;
  rating_avg: number;
  rating_count: number;
}

export interface DiscoverPage {
  items: DiscoverItem[];
  total: number;
  page: number;
  pageSize: number;
  totalsByType: Record<DiscoverType, number>;
  categories: { name: string; count: number }[];
  fetchedAt: number;
}

const Input = z.object({
  type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
  category: z.string().nullable().optional(),
  q: z.string().nullable().optional(),
  sort: z.enum(["popular", "newest", "oldest", "name"]).default("popular"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(60).default(24),
});

function verticalToCategory(v: string | null): string {
  if (!v) return "General";
  return v
    .split(/[-_/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  type: DiscoverType;
  description: string;
  author_handle: string;
  author_verified: boolean;
  install_count: number;
  latest_version: string;
  price_credits: number;
  created_at: string;
  vertical: string | null;
  category: string;
  search_blob: string;
};

type TypeCatalog = {
  rows: CatalogRow[];
  fetchedAt: number;
};

// Heavy per-type catalog (packages + their vertical from latest version + facet counts).
// Cached aggressively because it powers tab counts, facets, search and sort —
// the inputs change only when content is published. 5 min TTL absorbs traffic
// spikes; users can force refresh via router.invalidate() if needed.
const catalogCache = createTtlCache<TypeCatalog>(5 * 60 * 1000, { max: 8 });
const totalsCache = createTtlCache<Record<DiscoverType, number>>(5 * 60 * 1000, { max: 1 });

async function fetchTypeCatalog(type: DiscoverType): Promise<TypeCatalog> {
  const { data: pkgs, error } = await supabaseAdmin
    .from("packages")
    .select(
      "id, slug, name, type, description, author_handle, author_verified, install_count, latest_version, price_credits, created_at",
    )
    .eq("is_published", true)
    .eq("review_status", "approved")
    .eq("type", type)
    .limit(5000);
  if (error) throw new Response(error.message, { status: 500 });

  const verticalByPkg = new Map<string, string | null>();
  if (pkgs && pkgs.length) {
    const ids = pkgs.map((r: any) => r.id);
    const latestByPkg = new Map(pkgs.map((r: any) => [r.id, r.latest_version]));
    const { data: vers } = await supabaseAdmin
      .from("package_versions")
      .select("package_id, version, rules")
      .in("package_id", ids);
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

  const rows: CatalogRow[] = (pkgs ?? []).map((p: any) => {
    const vertical = verticalByPkg.get(p.id) ?? null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type as DiscoverType,
      description: p.description ?? "",
      author_handle: p.author_handle ?? "anonymous",
      author_verified: !!p.author_verified,
      install_count: p.install_count ?? 0,
      latest_version: p.latest_version,
      price_credits: p.price_credits ?? 0,
      created_at: p.created_at,
      vertical,
      category: verticalToCategory(vertical),
      // Precomputed lowercase blob for fast contains() search across the catalog.
      search_blob: `${p.slug} ${p.name ?? ""} ${p.description ?? ""}`.toLowerCase(),
    };
  });

  return { rows, fetchedAt: Date.now() };
}

async function fetchTotalsByType(): Promise<Record<DiscoverType, number>> {
  const countFor = async (t: DiscoverType) => {
    const { count, error } = await supabaseAdmin
      .from("packages")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("review_status", "approved")
      .eq("type", t);
    if (error) throw new Response(error.message, { status: 500 });
    return count ?? 0;
  };
  const [skill, playbook, soul, guardrail] = await Promise.all([
    countFor("skill"),
    countFor("playbook"),
    countFor("soul"),
    countFor("guardrail"),
  ]);
  return { skill, playbook, soul, guardrail };
}

/**
 * Paginated catalog query. The expensive per-type catalog + totals are cached
 * per isolate (5 min TTL). Filtering (q/category), sorting, and pagination run
 * in memory against the cached rows. Only reviews for the visible page are
 * fetched from the database each request.
 */
export const listDiscoverPage = createServerFn({ method: "GET" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }): Promise<DiscoverPage> => {
    const { type, category, q, sort, page, pageSize } = data;
    const term = (q ?? "").trim().toLowerCase();

    const [catalog, totalsByType] = await Promise.all([
      catalogCache.getOrLoad(type, () => fetchTypeCatalog(type)),
      totalsCache.getOrLoad("all", fetchTotalsByType),
    ]);

    // Facet counts derived from the full catalog (pre-filter, ignoring q to
    // keep them stable as the user types).
    const facetCounts = new Map<string, number>();
    for (const r of catalog.rows) {
      facetCounts.set(r.category, (facetCounts.get(r.category) ?? 0) + 1);
    }
    const categories = Array.from(facetCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // Filter
    let filtered = catalog.rows;
    if (category) filtered = filtered.filter((r) => r.category === category);
    if (term) filtered = filtered.filter((r) => r.search_blob.includes(term));

    // Sort
    filtered = filtered.slice().sort((a, b) => {
      switch (sort) {
        case "newest":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "oldest":
          return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "name":
          return a.name.localeCompare(b.name);
        case "popular":
        default:
          return (
            (b.install_count ?? 0) - (a.install_count ?? 0) ||
            (b.created_at ?? "").localeCompare(a.created_at ?? "")
          );
      }
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    if (!pageRows.length) {
      return {
        items: [],
        total,
        page: safePage,
        pageSize,
        totalsByType,
        categories,
        fetchedAt: catalog.fetchedAt,
      };
    }

    // Ratings only for the visible page.
    const pageIds = pageRows.map((r) => r.id);
    const ratingByPkg = new Map<string, { sum: number; count: number }>();
    const { data: rs } = await supabaseAdmin
      .from("reviews")
      .select("package_id, rating")
      .in("package_id", pageIds);
    for (const r of rs ?? []) {
      const cur = ratingByPkg.get(r.package_id) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      ratingByPkg.set(r.package_id, cur);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const items: DiscoverItem[] = pageRows.map((r) => {
      const rt = ratingByPkg.get(r.id) ?? { sum: 0, count: 0 };
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        type: r.type,
        description: r.description,
        author_handle: r.author_handle,
        author_verified: r.author_verified,
        install_count: r.install_count,
        latest_version: r.latest_version,
        price_credits: r.price_credits,
        vertical: r.vertical,
        category: r.category,
        rating_avg: rt.count ? round2(rt.sum / rt.count) : 0,
        rating_count: rt.count,
      };
    });

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalsByType,
      categories,
      fetchedAt: catalog.fetchedAt,
    };
  });
