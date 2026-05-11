import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { data: rid, error } = await context.supabase.rpc("submit_review", {
      _package_id: data.packageId,
      _rating: data.rating,
      _body: data.body,
      _rater_kind: data.raterKind,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { id: rid as string };
  });
