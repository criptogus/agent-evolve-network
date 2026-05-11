import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  evaluateRateLimit,
  logAuditAttempt,
  REPORT_RATE_RULES,
} from "./anti-fraud.server";

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
// Generated types don't yet know the new RPCs; cast through any for the call.
type AnyRpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

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
    const { data: rid, error } = await (context.supabase as unknown as AnyRpc).rpc("report_review", {
      _review_id: data.reviewId,
      _reason: data.reason,
      _details: data.details,
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

type RawReview = { id: string; rating: number; body: string | null; is_hidden: boolean; user_id: string };
type RawPackage = { id: string; name: string; slug: string };
type RawProfile = { id: string; display_name: string | null };

export const listReviewReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = (d ?? {}) as { status?: ReportStatus };
    return { status: (o.status ?? "open") as ReportStatus };
  })
  .handler(async ({ data, context }): Promise<{ reports: ReportRow[] }> => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("review_reports")
      .select("*")
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Response(error.message, { status: 500 });
    const list = rows ?? [];
    if (list.length === 0) return { reports: [] };

    const reviewIds = list.map((r) => r.review_id);
    const pkgIds = list.map((r) => r.package_id);
    const reporterIds = list.map((r) => r.reporter_id);

    const [revsRes, pkgsRes] = await Promise.all([
      supabaseAdmin.from("reviews").select("id, rating, body, is_hidden, user_id").in("id", reviewIds),
      supabaseAdmin.from("packages").select("id, name, slug").in("id", pkgIds),
    ]);
    const revs = (revsRes.data ?? []) as RawReview[];
    const pkgs = (pkgsRes.data ?? []) as RawPackage[];
    const profileIds = Array.from(new Set([...reporterIds, ...revs.map((r) => r.user_id)]));
    const profsRes = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds);
    const profs = (profsRes.data ?? []) as RawProfile[];

    const revMap = new Map(revs.map((r) => [r.id, r]));
    const pkgMap = new Map(pkgs.map((p) => [p.id, p]));
    const profMap = new Map(profs.map((p) => [p.id, p.display_name]));

    const reports: ReportRow[] = list.map((r) => {
      const rv = revMap.get(r.review_id);
      const pk = pkgMap.get(r.package_id);
      return {
        id: r.id,
        review_id: r.review_id,
        package_id: r.package_id,
        reporter_id: r.reporter_id,
        reason: r.reason as ReportReason,
        details: r.details,
        status: r.status as ReportStatus,
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
      reason: (o.reason ?? "").slice(0, 200),
      resolution: (o.resolution ?? "").slice(0, 500),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);
    const { error } = await (context.supabase as unknown as AnyRpc).rpc("moderate_review", {
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
      resolution: (o.resolution ?? "").slice(0, 500),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);
    const { error } = await (context.supabase as unknown as AnyRpc).rpc("resolve_report", {
      _report_id: data.reportId,
      _status: data.status,
      _resolution: data.resolution,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
