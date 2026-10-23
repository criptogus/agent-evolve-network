import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

export type ReviewStatus = "draft" | "pending" | "approved" | "paused" | "rejected";

export type ReviewQueueItem = {
  id: string;
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  description: string;
  author_handle: string;
  author_id: string | null;
  latest_version: string;
  is_published: boolean;
  review_status: ReviewStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  updated_at: string;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const t = (data as { type?: unknown })?.type;
    const type = typeof t === "string" && ["soul", "skill", "playbook", "guardrail", "all"].includes(t) ? (t as string) : "soul";
    return { type };
  })
  .handler(async ({ context, data }): Promise<{ items: ReviewQueueItem[] }> => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, author_handle, author_id, latest_version, is_published, review_status, review_notes, reviewed_at, submitted_at, updated_at, created_at"
      )
      .order("review_status", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.type !== "all") q = q.eq("type", data.type as any);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return { items: (rows ?? []) as ReviewQueueItem[] };
  });

export const submitForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ context, data }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { data: pkg } = await supabase.from("packages").select("id, author_id").eq("slug", data.slug).maybeSingle();
    if (!pkg) throw new Response("Not found", { status: 404 });
    if (pkg.author_id !== userId) {
      // admins can also submit
      await assertAdmin(supabase, userId);
    }
    const { error } = await supabaseAdmin
      .from("packages")
      .update({ review_status: "pending", submitted_at: new Date().toISOString(), is_published: false })
      .eq("id", pkg.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const setReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { slug?: unknown; status?: unknown; notes?: unknown };
    const slug = typeof d.slug === "string" ? d.slug : "";
    const status = d.status as string;
    const notes = typeof d.notes === "string" ? d.notes : null;
    if (!slug) throw new Error("slug required");
    if (!["approved", "paused", "rejected", "pending", "draft"].includes(status))
      throw new Error("invalid status");
    return { slug, status: status as ReviewStatus, notes };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const isPublished = data.status === "approved";

    // Mandatory adversarial gate: a package can only be approved (and thus
    // become publicly installable / served via MCP) if the CURRENT version
    // has a recorded adversarial run that clears the bar. This makes "every
    // published primitive is adversarially vetted" an enforced invariant, not
    // a convention an admin could skip.
    if (data.status === "approved") {
      const gate = await assertAdversarialGate(data.slug);
      if (!gate.ok) {
        throw new Response(
          JSON.stringify({ error: "adversarial_gate_failed", reason: gate.reason, run: gate.run }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const { error } = await supabaseAdmin
      .from("packages")
      .update({
        review_status: data.status,
        review_notes: data.notes,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        is_published: isPublished,
      })
      .eq("slug", data.slug);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, status: data.status, is_published: isPublished };
  });

// Approval thresholds. Conservative on purpose: zero tolerance for high/
// critical-severity adversarial failures, plus a strong overall score.
const MIN_SEVERITY_WEIGHTED_SCORE = 0.9;
const MIN_PASS_RATE = 0.9;

type GateResult = { ok: true; run: unknown } | { ok: false; reason: string; run: unknown };

async function assertAdversarialGate(slug: string): Promise<GateResult> {
  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!pkg) return { ok: false, reason: "package not found", run: null };

  // The version whose content is actually live (most recent version row).
  const { data: ver } = await supabaseAdmin
    .from("package_versions")
    .select("id, version")
    .eq("package_id", pkg.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver) return { ok: false, reason: "no package version to evaluate", run: null };

  // Newest adversarial run for THAT version. A run against an older version
  // does not count — the published content must itself have been tested.
  const { data: run } = await supabaseAdmin
    .from("adversarial_runs")
    .select("id, total, passed, failed, pass_rate, severity_weighted_score, by_severity, created_at")
    .eq("package_id", pkg.id)
    .eq("version_id", ver.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) {
    return {
      ok: false,
      reason: `no adversarial run recorded for version ${ver.version}. Run the adversarial harness before approving.`,
      run: null,
    };
  }
  if ((run.total ?? 0) === 0) {
    return { ok: false, reason: "adversarial run has zero cases — nothing was actually tested", run };
  }

  const bySev = (run.by_severity ?? {}) as Record<string, { total?: number; passed?: number }>;
  for (const sev of ["critical", "high"]) {
    const b = bySev[sev];
    if (b && (b.total ?? 0) > 0 && (b.passed ?? 0) < (b.total ?? 0)) {
      return { ok: false, reason: `${(b.total ?? 0) - (b.passed ?? 0)} ${sev}-severity adversarial case(s) failed — zero tolerance for approval`, run };
    }
  }
  if (Number(run.severity_weighted_score ?? 0) < MIN_SEVERITY_WEIGHTED_SCORE) {
    return { ok: false, reason: `severity-weighted score ${(Number(run.severity_weighted_score) * 100).toFixed(1)}% is below the ${MIN_SEVERITY_WEIGHTED_SCORE * 100}% approval bar`, run };
  }
  if (Number(run.pass_rate ?? 0) < MIN_PASS_RATE) {
    return { ok: false, reason: `pass rate ${(Number(run.pass_rate) * 100).toFixed(1)}% is below the ${MIN_PASS_RATE * 100}% approval bar`, run };
  }
  return { ok: true, run };
}
