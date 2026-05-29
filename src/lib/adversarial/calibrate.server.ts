/**
 * Run the adversarial suite against a published package with the LLM judge
 * ensemble, and persist the result — including judge↔deterministic calibration
 * (agreement + Cohen's κ) — to the adversarial_runs telemetry the Trust Score
 * reads. Admin-only; server-only.
 *
 * This closes the judge loop: the judge defined in judge.server.ts now produces
 * an auditable, stored signal rather than living only in the library layer.
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGatewayModel, describeGatewayConfig } from "@/lib/ai-gateway";
import { runAdversarialSuite, type ModelInvoker } from "./runner";
import { judgeCalibration, type Verdict } from "./judge";
import { getLlmJudgeOrNull, DEFAULT_JUDGE_MODEL } from "./judge.server";

const supabaseAdmin = _supabaseAdmin as any;

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

// The skill-under-test runs on the configured default (cheap) model; the judge
// is a separate, independent model call so it isn't grading its own output.
const skillInvoker: ModelInvoker = async ({ system_prompt, user_input, context }) => {
  const { text } = await generateText({
    model: getGatewayModel(),
    system: system_prompt,
    prompt: context ? `${context}\n\n${user_input}` : user_input,
  });
  return text;
};

export type JudgeCalibrationRow = {
  slug: string;
  name: string;
  type: string;
  latest_kappa: number | null;
  latest_agreement: number | null;
  latest_overrides: number | null;
  latest_cases: number | null;
  runs: number;
  last_run_at: string | null;
  /** κ over recent runs, oldest→newest, for a sparkline. */
  kappa_history: number[];
};

/** Per-package judge calibration history. Admin only. */
export const getJudgeCalibration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const days = (d as { days?: unknown })?.days;
    return { days: typeof days === "number" && days > 0 && days <= 365 ? days : 90 };
  })
  .handler(async ({ context, data }): Promise<{ days: number; rows: JudgeCalibrationRow[] }> => {
    await assertAdmin(context.supabase, context.userId);

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: runs, error } = await supabaseAdmin
      .from("adversarial_runs")
      .select("package_id, judge_kappa, judge_agreement, judge_overrides, judge_cases, created_at")
      .not("judge_kappa", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) throw new Response(error.message, { status: 500 });

    const byPkg = new Map<string, typeof runs>();
    for (const r of runs ?? []) {
      const arr = byPkg.get(r.package_id) ?? [];
      arr.push(r);
      byPkg.set(r.package_id, arr);
    }
    if (byPkg.size === 0) return { days: data.days, rows: [] };

    const { data: pkgs } = await supabaseAdmin
      .from("packages")
      .select("id, slug, name, type")
      .in("id", Array.from(byPkg.keys()));
    const meta = new Map((pkgs ?? []).map((p: any) => [p.id, p]));

    const rows: JudgeCalibrationRow[] = [];
    for (const [pkgId, list] of byPkg) {
      const m = meta.get(pkgId);
      if (!m) continue;
      const last = list[list.length - 1];
      rows.push({
        slug: m.slug,
        name: m.name,
        type: m.type,
        latest_kappa: last.judge_kappa,
        latest_agreement: last.judge_agreement,
        latest_overrides: last.judge_overrides,
        latest_cases: last.judge_cases,
        runs: list.length,
        last_run_at: last.created_at,
        kappa_history: list.map((r) => Number(r.judge_kappa)).slice(-20),
      });
    }
    // Lowest κ first — the packages whose judge is drifting need attention.
    rows.sort((a, b) => (a.latest_kappa ?? 1) - (b.latest_kappa ?? 1));
    return { days: data.days, rows };
  });

/**
 * Recalibrate the LLM judge against a package's golden labels.
 *
 * Each active golden case carries a human/reference ground-truth verdict
 * (`label_pass`). We show the judge the reference output and ask it to grade,
 * then compute judge↔truth agreement + Cohen's κ and persist it to the latest
 * package_evaluations.judge_calibration — the column the project already
 * reserves for "how well did the judge agree with the golden labels". Admin only.
 *
 * Scheduling: drive this from a Vercel Cron / GitHub Action that authenticates
 * as an admin and POSTs per package (see docs/product/EVALUATION-ALGORITHM-ANALYSIS.md).
 */
export const recalibrateJudgeAgainstGolden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !slug) throw new Response("slug required", { status: 400 });
    return { slug };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const judge = getLlmJudgeOrNull();
    if (!judge) throw new Response("No AI gateway configured for the judge", { status: 422 });

    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id, slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg) throw new Response("package not found", { status: 404 });

    const { data: golden } = await supabaseAdmin
      .from("package_golden_cases")
      .select("title, input, expected_output, label_pass")
      .eq("package_id", pkg.id)
      .eq("is_active", true)
      .limit(100);
    if (!golden?.length) throw new Response("package has no active golden cases", { status: 422 });

    const human: Verdict[] = [];
    const judged: Verdict[] = [];
    let skipped = 0;
    for (const g of golden) {
      // Show the judge the reference output and ask if it satisfies the task.
      // A judge error must NOT be coerced into "fail" — that would pollute κ
      // with artificial disagreement. Skip the case and count it instead.
      let verdict;
      try {
        verdict = await judge({
          caseId: g.title ?? "golden",
          input: g.input ?? "",
          output: g.expected_output ?? "",
          rubric: {
            criteria: [`The answer correctly, safely and completely addresses the request.`],
          },
        });
      } catch {
        skipped++;
        continue;
      }
      human.push(g.label_pass ? "pass" : "fail");
      judged.push(verdict.verdict);
    }
    if (human.length === 0) {
      throw new Response("judge failed on every golden case (gateway error?)", { status: 502 });
    }

    const report = judgeCalibration(human, judged);
    const calibration = {
      ...report,
      skipped,
      judge_model: DEFAULT_JUDGE_MODEL,
      against: "golden_labels",
      calibrated_at: new Date().toISOString(),
    };

    // Attach to the latest evaluation row, or create a lightweight one.
    const { data: latest } = await supabaseAdmin
      .from("package_evaluations")
      .select("id")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      await supabaseAdmin
        .from("package_evaluations")
        .update({ judge_calibration: calibration })
        .eq("id", latest.id);
    } else {
      await supabaseAdmin.from("package_evaluations").insert({
        package_id: pkg.id,
        triggered_by: context.userId,
        trigger_kind: "calibration",
        judge_calibration: calibration,
      });
    }

    return { ok: true as const, slug: pkg.slug, calibration };
  });

export const runAdversarialWithJudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !slug) throw new Response("slug required", { status: 400 });
    const judgeMode = (data as { judgeMode?: unknown })?.judgeMode;
    return { slug, judgeMode: judgeMode === "lenient" ? "lenient" : "strict" } as const;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id, slug, type, latest_version")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg) throw new Response("package not found", { status: 404 });

    // Latest version supplies the system prompt + tags for case selection.
    const { data: version } = await supabaseAdmin
      .from("package_versions")
      .select("id, system_prompt, tags")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!version?.system_prompt) throw new Response("package has no system prompt", { status: 422 });

    const judge = getLlmJudgeOrNull();
    const t0 = Date.now();
    const report = await runAdversarialSuite({
      systemPrompt: version.system_prompt,
      invoke: skillInvoker,
      packageType: pkg.type,
      packageSlug: pkg.slug,
      tags: (version.tags as string[]) ?? [],
      judge,
      judgeMode: data.judgeMode,
    });
    const duration_ms = Date.now() - t0;

    const cal = report.judge_calibration;
    const { error } = await supabaseAdmin.from("adversarial_runs").insert({
      package_id: pkg.id,
      version_id: version.id,
      triggered_by: context.userId,
      trigger_kind: "manual",
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      pass_rate: report.pass_rate,
      severity_weighted_score: report.severity_weighted_score,
      by_category: report.by_category,
      by_severity: report.by_severity,
      outcomes: report.outcomes,
      duration_ms,
      // The model that produced the outputs under test (skill-under-test runs
      // on the configured default), kept distinct from the judge model.
      model: describeGatewayConfig().defaultModel,
      judge_model: judge ? DEFAULT_JUDGE_MODEL : null,
      judge_cases: cal?.model_judged ?? null,
      judge_overrides: cal?.overrides ?? null,
      judge_agreement: cal?.agreement ?? null,
      judge_kappa: cal?.kappa ?? null,
    });
    if (error) throw new Response(error.message, { status: 500 });

    return {
      ok: true as const,
      slug: pkg.slug,
      total: report.total,
      passed: report.passed,
      pass_rate: report.pass_rate,
      severity_weighted_score: report.severity_weighted_score,
      judge_used: Boolean(judge),
      judge_calibration: cal ?? null,
    };
  });
