import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

/**
 * Paginated catalog query. Keeps navigation responsive by fetching counts for
 * the tabs separately, then only loading the selected type's catalog and
 * version metadata for facets.
 */
export const listDiscoverPage = createServerFn({ method: "GET" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }): Promise<DiscoverPage> => {
    const { type, category, q, sort, page, pageSize } = data;
    const term = (q ?? "").trim().toLowerCase();

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

    const [skillCount, playbookCount, soulCount, guardrailCount, packageResult] =
      await Promise.all([
        countFor("skill"),
        countFor("playbook"),
        countFor("soul"),
        countFor("guardrail"),
        supabaseAdmin
          .from("packages")
          .select(
            "id, slug, name, type, description, author_handle, author_verified, install_count, latest_version, price_credits, created_at",
          )
          .eq("is_published", true)
          .eq("review_status", "approved")
          .eq("type", type)
          .limit(5000),
      ]);

    if (packageResult.error) throw new Response(packageResult.error.message, { status: 500 });

    const totalsByType: Record<DiscoverType, number> = {
      skill: skillCount,
      playbook: playbookCount,
      soul: soulCount,
      guardrail: guardrailCount,
    };

    const allOfType = (packageResult.data ?? []).slice().sort((a, b) => {
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

    // Vertical map from latest version's rules for the selected type only.
    const verticalByPkg = new Map<string, string | null>();
    if (allOfType.length) {
      const ids = allOfType.map((r) => r.id);
      const latestByPkg = new Map(allOfType.map((r) => [r.id, r.latest_version]));
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

    // 3) Totals per type — every approved package counts here.
    const totalsByType: Record<DiscoverType, number> = {
      skill: 0,
      playbook: 0,
      soul: 0,
      guardrail: 0,
    };
    for (const r of allIndex) {
      const t = r.type as DiscoverType;
      if (t in totalsByType) totalsByType[t] += 1;
    }

    // 4) Filter by current type (always) and compute category facets.
    const ofType = allIndex.filter((r) => r.type === type);

    const facetCounts = new Map<string, number>();
    for (const r of ofType) {
      const cat = verticalToCategory(verticalByPkg.get(r.id) ?? null);
      facetCounts.set(cat, (facetCounts.get(cat) ?? 0) + 1);
    }
    const categories = Array.from(facetCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // 5) Apply category + free-text filters (text matches slug here; full
    //    description match happens after hydration as a refinement).
    let filtered = ofType;
    if (category) {
      filtered = filtered.filter(
        (r) => verticalToCategory(verticalByPkg.get(r.id) ?? null) === category,
      );
    }
    if (term) {
      filtered = filtered.filter((r) => r.slug.toLowerCase().includes(term));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);
    const pageIds = pageRows.map((r) => r.id);

    if (!pageIds.length) {
      return {
        items: [],
        total,
        page: safePage,
        pageSize,
        totalsByType,
        categories,
        fetchedAt: Date.now(),
      };
    }

    // 6) Hydrate the page slice with heavy fields.
    const { data: full } = await supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, author_handle, author_verified, install_count, latest_version, price_credits",
      )
      .in("id", pageIds);
    const fullById = new Map((full ?? []).map((r) => [r.id, r]));

    // 7) Ratings only for the visible page.
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
    const items: DiscoverItem[] = pageRows
      .map((r) => {
        const f = fullById.get(r.id);
        if (!f) return null;
        const vertical = verticalByPkg.get(r.id) ?? null;
        const rt = ratingByPkg.get(r.id) ?? { sum: 0, count: 0 };
        return {
          id: f.id,
          slug: f.slug,
          name: f.name,
          type: f.type as DiscoverType,
          description: f.description ?? "",
          author_handle: f.author_handle ?? "anonymous",
          author_verified: !!f.author_verified,
          install_count: f.install_count ?? 0,
          latest_version: f.latest_version,
          price_credits: f.price_credits ?? 0,
          vertical,
          category: verticalToCategory(vertical),
          rating_avg: rt.count ? round2(rt.sum / rt.count) : 0,
          rating_count: rt.count,
        } satisfies DiscoverItem;
      })
      .filter((x): x is DiscoverItem => x !== null);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalsByType,
      categories,
      fetchedAt: Date.now(),
    };
  });
