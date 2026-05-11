import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or promotional" },
  { value: "abusive", label: "Abusive / hateful" },
  { value: "harassment", label: "Harassment" },
  { value: "fake", label: "Fake or fraudulent" },
  { value: "off_topic", label: "Off-topic" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportStatus = "open" | "actioned" | "dismissed";

export type ReportRow = {
  id: string;
  review_id: string;
  package_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_name: string | null;
  package_name: string | null;
  package_slug: string | null;
  review_rating: number | null;
  review_body: string | null;
  review_user_name: string | null;
  review_is_hidden: boolean;
};

const REASONS = REPORT_REASONS.map((r) => r.value) as ReportReason[];

export const reportReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { reviewId?: string; reason?: string; details?: string };
    if (!o?.reviewId) throw new Error("reviewId required");
    if (!o?.reason || !REASONS.includes(o.reason as ReportReason)) {
      throw new Error("invalid reason");
    }
    return {
      reviewId: o.reviewId,
      reason: o.reason as ReportReason,
      details: (o.details ?? "").slice(0, 1000),
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: rid, error } = await context.supabase.rpc("report_review", {
      _review_id: data.reviewId,
      _reason: data.reason,
      _details: data.details || null,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { id: rid as string };
  });

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listReviewReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = (d ?? {}) as { status?: ReportStatus };
    return { status: (o.status ?? "open") as ReportStatus };
  })
  .handler(async ({ data, context }): Promise<{ reports: ReportRow[] }> => {
    await assertAdmin(context.user.id);
    const { data: rows, error } = await supabaseAdmin
      .from("review_reports")
      .select(
        `id, review_id, package_id, reporter_id, reason, details, status, resolution,
         created_at, resolved_at,
         reporter:profiles!review_reports_reporter_id_fkey(display_name),
         package:packages!review_reports_package_id_fkey(name, slug),
         review:reviews!review_reports_review_id_fkey(
           rating, body, is_hidden, user_id,
           review_user:profiles!reviews_user_id_fkey(display_name)
         )`
      )
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      // Fallback without explicit fk hints if names differ
      const { data: rows2, error: e2 } = await supabaseAdmin
        .from("review_reports")
        .select("*")
        .eq("status", data.status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (e2) throw new Response(e2.message, { status: 500 });
      const ids = (rows2 ?? []).map((r) => r.review_id);
      const pkgIds = (rows2 ?? []).map((r) => r.package_id);
      const reporterIds = (rows2 ?? []).map((r) => r.reporter_id);
      const [{ data: revs }, { data: pkgs }, { data: profs }] = await Promise.all([
        supabaseAdmin.from("reviews").select("id, rating, body, is_hidden, user_id").in("id", ids),
        supabaseAdmin.from("packages").select("id, name, slug").in("id", pkgIds),
        supabaseAdmin.from("profiles").select("id, display_name").in("id", [...reporterIds, ...((revs ?? []).map((r) => r.user_id))]),
      ]);
      const revMap = new Map((revs ?? []).map((r) => [r.id, r]));
      const pkgMap = new Map((pkgs ?? []).map((p) => [p.id, p]));
      const profMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      const out: ReportRow[] = (rows2 ?? []).map((r) => {
        const rv = revMap.get(r.review_id);
        const pk = pkgMap.get(r.package_id);
        return {
          id: r.id,
          review_id: r.review_id,
          package_id: r.package_id,
          reporter_id: r.reporter_id,
          reason: r.reason,
          details: r.details,
          status: r.status,
          resolution: r.resolution,
          created_at: r.created_at,
          resolved_at: r.resolved_at,
          reporter_name: profMap.get(r.reporter_id) ?? null,
          package_name: pk?.name ?? null,
          package_slug: pk?.slug ?? null,
          review_rating: rv?.rating ?? null,
          review_body: rv?.body ?? null,
          review_user_name: rv ? profMap.get(rv.user_id) ?? null : null,
          review_is_hidden: !!rv?.is_hidden,
        };
      });
      return { reports: out };
    }
    const reports: ReportRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      review_id: r.review_id,
      package_id: r.package_id,
      reporter_id: r.reporter_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
      reporter_name: r.reporter?.display_name ?? null,
      package_name: r.package?.name ?? null,
      package_slug: r.package?.slug ?? null,
      review_rating: r.review?.rating ?? null,
      review_body: r.review?.body ?? null,
      review_user_name: r.review?.review_user?.display_name ?? null,
      review_is_hidden: !!r.review?.is_hidden,
    }));
    return { reports };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { reviewId?: string; hide?: boolean; reason?: string; resolution?: string };
    if (!o?.reviewId) throw new Error("reviewId required");
    return {
      reviewId: o.reviewId,
      hide: !!o.hide,
      reason: (o.reason ?? "").slice(0, 200) || null,
      resolution: (o.resolution ?? "").slice(0, 500) || null,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.user.id);
    const { error } = await context.supabase.rpc("moderate_review", {
      _review_id: data.reviewId,
      _hide: data.hide,
      _reason: data.reason,
      _resolution: data.resolution,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { reportId?: string; status?: string; resolution?: string };
    if (!o?.reportId) throw new Error("reportId required");
    if (o.status !== "actioned" && o.status !== "dismissed") throw new Error("invalid status");
    return {
      reportId: o.reportId,
      status: o.status as "actioned" | "dismissed",
      resolution: (o.resolution ?? "").slice(0, 500) || null,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.user.id);
    const { error } = await context.supabase.rpc("resolve_report", {
      _report_id: data.reportId,
      _status: data.status,
      _resolution: data.resolution,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
