import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  evaluateRateLimit,
  logAuditAttempt,
  REVIEW_RATE_RULES,
} from "./anti-fraud.server";

export type RaterKind = "human" | "agent";

export type Ratings = {
  human_count: number;
  human_avg: number;
  agent_count: number;
  agent_avg: number;
  total_count: number;
  total_avg: number;
};

export type ReviewItem = {
  id: string;
  rating: number;
  body: string | null;
  rater_kind: RaterKind;
  verified_purchase: boolean;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Eligibility = {
  authenticated: boolean;
  can_review: boolean;
  has_purchase?: boolean;
  has_run?: boolean;
  reviewed_human?: boolean;
  reviewed_agent?: boolean;
  reason?: string | null;
};

async function packageIdFromSlug(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("packages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export const getPackageRatings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const o = d as { slug?: string; packageId?: string };
    if (!o?.slug && !o?.packageId) throw new Error("slug or packageId required");
    return { slug: o.slug, packageId: o.packageId };
  })
  .handler(async ({ data }): Promise<{ packageId: string | null; ratings: Ratings; reviews: ReviewItem[] }> => {
    const pid = data.packageId ?? (data.slug ? await packageIdFromSlug(data.slug) : null);
    if (!pid) {
      return {
        packageId: null,
        ratings: { human_count: 0, human_avg: 0, agent_count: 0, agent_avg: 0, total_count: 0, total_avg: 0 },
        reviews: [],
      };
    }
    const [{ data: ratings }, { data: reviews }] = await Promise.all([
      supabaseAdmin.rpc("get_package_ratings", { _package_id: pid }),
      supabaseAdmin.rpc("list_package_reviews", { _package_id: pid, _limit: 50 }),
    ]);
    return {
      packageId: pid,
      ratings: (ratings ?? { human_count: 0, human_avg: 0, agent_count: 0, agent_avg: 0, total_count: 0, total_avg: 0 }) as Ratings,
      reviews: (reviews ?? []) as ReviewItem[],
    };
  });

export type ReviewSort = "recent" | "helpful" | "best_human" | "best_agent";
export const REVIEW_SORTS: { value: ReviewSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "helpful", label: "Most helpful" },
  { value: "best_human", label: "Best (humans)" },
  { value: "best_agent", label: "Best (agents)" },
];

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null };
type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  rater_kind: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_id: string;
};

export const listPackageReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const o = d as { slug?: string; packageId?: string; sort?: ReviewSort; offset?: number; limit?: number };
    if (!o?.slug && !o?.packageId) throw new Error("slug or packageId required");
    const sort = (o.sort ?? "recent") as ReviewSort;
    if (!["recent", "helpful", "best_human", "best_agent"].includes(sort)) {
      throw new Error("invalid sort");
    }
    return {
      slug: o.slug,
      packageId: o.packageId,
      sort,
      offset: Math.max(0, Math.min(Number(o.offset ?? 0), 5000)),
      limit: Math.max(1, Math.min(Number(o.limit ?? 10), 50)),
    };
  })
  .handler(async ({ data }): Promise<{ reviews: ReviewItem[]; total: number; hasMore: boolean }> => {
    const pid = data.packageId ?? (data.slug ? await packageIdFromSlug(data.slug) : null);
    if (!pid) return { reviews: [], total: 0, hasMore: false };

    let q = supabaseAdmin
      .from("reviews")
      .select("id, rating, body, rater_kind, verified_purchase, helpful_count, created_at, user_id", { count: "exact" })
      .eq("package_id", pid)
      .eq("is_hidden", false);

    if (data.sort === "best_human") q = q.eq("rater_kind", "human");
    if (data.sort === "best_agent") q = q.eq("rater_kind", "agent");

    if (data.sort === "helpful") {
      q = q.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });
    } else if (data.sort === "best_human" || data.sort === "best_agent") {
      q = q.order("rating", { ascending: false }).order("created_at", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    q = q.range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    const list = (rows ?? []) as ReviewRow[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const profsRes = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", ids)
      : { data: [] as ProfileRow[] };
    const map = new Map(((profsRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
    const reviews: ReviewItem[] = list.map((r) => {
      const p = map.get(r.user_id);
      return {
        id: r.id,
        rating: r.rating,
        body: r.body,
        rater_kind: r.rater_kind as RaterKind,
        verified_purchase: r.verified_purchase,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });
    const total = count ?? reviews.length;
    return { reviews, total, hasMore: data.offset + reviews.length < total };
  });

export const getReviewEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { slug?: string; packageId?: string };
    if (!o?.slug && !o?.packageId) throw new Error("slug or packageId required");
    return { slug: o.slug, packageId: o.packageId };
  })
  .handler(async ({ data, context }): Promise<Eligibility & { packageId: string | null }> => {
    const pid = data.packageId ?? (data.slug ? await packageIdFromSlug(data.slug) : null);
    if (!pid) return { authenticated: true, can_review: false, packageId: null, reason: "PACKAGE_NOT_FOUND" };
    const { data: elig, error } = await context.supabase.rpc("get_review_eligibility", { _package_id: pid });
    if (error) throw new Response(error.message, { status: 500 });
    return { ...(elig as Eligibility), packageId: pid };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { packageId: string; rating: number; body?: string; raterKind: RaterKind };
    if (!o?.packageId) throw new Error("packageId required");
    if (![1, 2, 3, 4, 5].includes(Number(o.rating))) throw new Error("rating 1-5 required");
    if (o.raterKind !== "human" && o.raterKind !== "agent") throw new Error("invalid raterKind");
    return {
      packageId: o.packageId,
      rating: Number(o.rating),
      body: (o.body ?? "").slice(0, 2000),
      raterKind: o.raterKind,
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // 1) Per-user rate limit (counts both allowed + blocked attempts).
    const blocked = await evaluateRateLimit({
      userId: context.userId,
      kind: "review_submit",
      rules: REVIEW_RATE_RULES,
    });
    if (blocked) {
      await logAuditAttempt({
        userId: context.userId,
        kind: "review_submit",
        outcome: "blocked",
        packageId: data.packageId,
        reason: blocked.reason,
        metadata: { rating: data.rating, rater_kind: data.raterKind },
      });
      throw new Response(`RATE_LIMITED:${blocked.reason}`, { status: 429 });
    }

    // 2) Hand off to the DB RPC, which runs the eligibility + cooldown triggers.
    const { data: rid, error } = await context.supabase.rpc("submit_review", {
      _package_id: data.packageId,
      _rating: data.rating,
      _body: data.body,
      _rater_kind: data.raterKind,
    });

    if (error) {
      await logAuditAttempt({
        userId: context.userId,
        kind: "review_submit",
        outcome: "blocked",
        packageId: data.packageId,
        reason: error.message?.slice(0, 200) ?? "DB_REJECTED",
        metadata: { rating: data.rating, rater_kind: data.raterKind },
      });
      throw new Response(error.message, { status: 400 });
    }

    await logAuditAttempt({
      userId: context.userId,
      kind: "review_submit",
      outcome: "allowed",
      packageId: data.packageId,
      reviewId: rid as string,
      metadata: { rating: data.rating, rater_kind: data.raterKind },
    });
    return { id: rid as string };
  });
