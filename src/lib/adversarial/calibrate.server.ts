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
import { getGatewayModel } from "@/lib/ai-gateway";
import { runAdversarialSuite, type ModelInvoker } from "./runner";
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
      model: DEFAULT_JUDGE_MODEL,
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
