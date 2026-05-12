import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createTtlCache } from "@/lib/cache/ttl-cache";

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
  rating_avg: number;
  rating_count: number;
  rating_human_count: number;
  rating_human_avg: number;
  rating_agent_count: number;
  rating_agent_avg: number;
};

type CacheEntry = { at: number; payload: { items: MarketplaceItem[]; verticals: string[] } };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
let _cache: CacheEntry | null = null;
let _inflight: Promise<{ items: MarketplaceItem[]; verticals: string[] }> | null = null;

async function fetchMarketplace(): Promise<{ items: MarketplaceItem[]; verticals: string[] }> {
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

    // Aggregate ratings per package (single grouped query)
    const ratingByPkg = new Map<
      string,
      { sum: number; count: number; humanSum: number; humanCount: number; agentSum: number; agentCount: number }
    >();
    if (ids.length) {
      const { data: rs } = await supabaseAdmin
        .from("reviews")
        .select("package_id, rating, rater_kind")
        .in("package_id", ids);
      for (const r of rs ?? []) {
        const cur = ratingByPkg.get(r.package_id) ?? {
          sum: 0,
          count: 0,
          humanSum: 0,
          humanCount: 0,
          agentSum: 0,
          agentCount: 0,
        };
        cur.sum += r.rating;
        cur.count += 1;
        if (r.rater_kind === "agent") {
          cur.agentSum += r.rating;
          cur.agentCount += 1;
        } else {
          cur.humanSum += r.rating;
          cur.humanCount += 1;
        }
        ratingByPkg.set(r.package_id, cur);
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const items: MarketplaceItem[] = (pkgs ?? []).map((p) => {
      const rt =
        ratingByPkg.get(p.id) ??
        { sum: 0, count: 0, humanSum: 0, humanCount: 0, agentSum: 0, agentCount: 0 };
      return {
        ...p,
        type: p.type as MarketplaceItem["type"],
        vertical: verticalByPkg.get(p.id) ?? null,
        price_credits: p.price_credits ?? 0,
        rating_avg: rt.count ? round2(rt.sum / rt.count) : 0,
        rating_count: rt.count,
        rating_human_count: rt.humanCount,
        rating_human_avg: rt.humanCount ? round2(rt.humanSum / rt.humanCount) : 0,
        rating_agent_count: rt.agentCount,
        rating_agent_avg: rt.agentCount ? round2(rt.agentSum / rt.agentCount) : 0,
      };
    });

    const vs = new Set<string>();
    for (const it of items) if (it.vertical) vs.add(it.vertical);
    return { items, verticals: Array.from(vs).sort() };
}

export const listMarketplace = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: MarketplaceItem[]; verticals: string[] }> => {
    const now = Date.now();
    if (_cache && now - _cache.at < CACHE_TTL_MS) return _cache.payload;
    if (_inflight) return _inflight;
    _inflight = fetchMarketplace()
      .then((payload) => {
        _cache = { at: Date.now(), payload };
        return payload;
      })
      .finally(() => {
        _inflight = null;
      });
    try {
      return await _inflight;
    } catch (err) {
      // On failure, serve stale cache if available so the UI doesn't break.
      if (_cache) return _cache.payload;
      throw err;
    }
  }
);

