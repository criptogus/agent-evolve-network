/**
 * Skill Drift Detection — compares recent (7d) success rate against the
 * preceding baseline window (8-35d back). If the recent window has enough
 * volume and shows a meaningful drop, file a drift alert with an
 * AI-suggested patch the author can apply or reject.
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin/middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { getGatewayModel } from "@/lib/ai-gateway";

const MIN_RECENT_RUNS = 50;
const MIN_BASELINE_RUNS = 100;
const WARN_DROP = 0.05; // 5pp
const CRIT_DROP = 0.15; // 15pp

const PatchSchema = z.object({
  rationale: z.string().max(800),
  suggested_patch: z.string().min(20).max(4000),
  triggered_by_model: z.string().optional(),
});

const Input = z.object({
  slug: z.string().optional(),
  window_days: z.number().int().min(1).max(30).default(7),
});

async function suggestPatch(opts: {
  name: string;
  systemPrompt: string;
  recentRate: number;
  baselineRate: number;
  failingPatterns: Array<{ model: string | null; error_kind: string | null; count: number }>;
}) {
  try {
    const out = await generateText({
      model: getGatewayModel("openai/gpt-5.2"),
      system:
        "You are SkillForge Drift Doctor. Given a skill's system prompt and telemetry showing a regression, propose a minimal, surgical patch to the system prompt that addresses the most likely root cause. Output strict JSON with a rationale and the FULL revised system prompt as suggested_patch. Do not over-rewrite — keep author voice and structure.",
      prompt: JSON.stringify({
        name: opts.name,
        current_system_prompt: opts.systemPrompt,
        regression: {
          recent_success_rate: opts.recentRate,
          baseline_success_rate: opts.baselineRate,
          top_failure_patterns: opts.failingPatterns.slice(0, 8),
        },
      }),
      experimental_output: Output.object({ schema: PatchSchema }),
    });
    return (out as { experimental_output: z.infer<typeof PatchSchema> }).experimental_output;
  } catch {
    return null;
  }
}

export const detectSkillDrift = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const window_days = data.window_days;
    let pkgQuery = supabaseAdmin.from("packages").select("id,slug,name");
    if (data.slug) pkgQuery = pkgQuery.eq("slug", data.slug);
    else pkgQuery = pkgQuery.eq("is_published", true);
    const { data: pkgs } = await pkgQuery.limit(data.slug ? 1 : 200);

    const alerts: Array<{ slug: string; severity: string; delta: number }> = [];

    for (const pkg of pkgs ?? []) {
      const { data: drift } = await supabaseAdmin.rpc("compute_skill_drift", {
        _package_id: pkg.id,
        _window_days: window_days,
      } as any);
      const d = drift as {
        recent_runs: number;
        recent_rate: number | null;
        baseline_runs: number;
        baseline_rate: number | null;
        delta: number | null;
      } | null;
      if (!d || d.recent_rate == null || d.baseline_rate == null) continue;
      if (d.recent_runs < MIN_RECENT_RUNS || d.baseline_runs < MIN_BASELINE_RUNS) continue;
      const delta = d.recent_rate - d.baseline_rate;
      if (delta > -WARN_DROP) continue;

      const severity = delta <= -CRIT_DROP ? "critical" : "warn";

      // Pull failing patterns to inform the patch
      const { data: fails } = await supabaseAdmin
        .from("skill_executions")
        .select("model,error_kind")
        .eq("package_id", pkg.id)
        .eq("success", false)
        .gt("created_at", new Date(Date.now() - window_days * 86400_000).toISOString())
        .limit(500);
      const counts = new Map<string, { model: string | null; error_kind: string | null; count: number }>();
      for (const f of fails ?? []) {
        const k = `${f.model ?? "?"}|${f.error_kind ?? "?"}`;
        const e = counts.get(k) ?? { model: f.model, error_kind: f.error_kind, count: 0 };
        e.count++;
        counts.set(k, e);
      }
      const top = [...counts.values()].sort((a, b) => b.count - a.count);

      // Load latest version system_prompt to ground the patch
      const { data: ver } = await supabaseAdmin
        .from("package_versions")
        .select("system_prompt")
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let suggested: { rationale: string; suggested_patch: string } | null = null;
      if (ver?.system_prompt) {
        suggested = await suggestPatch({
          name: pkg.name,
          systemPrompt: ver.system_prompt,
          recentRate: d.recent_rate,
          baselineRate: d.baseline_rate,
          failingPatterns: top,
        });
      }

      await supabaseAdmin.from("skill_drift_alerts").insert({
        package_id: pkg.id,
        package_slug: pkg.slug,
        window_days,
        baseline_runs: d.baseline_runs,
        recent_runs: d.recent_runs,
        baseline_rate: Number(d.baseline_rate.toFixed(4)),
        recent_rate: Number(d.recent_rate.toFixed(4)),
        delta: Number(delta.toFixed(4)),
        severity,
        suggested_patch: suggested?.suggested_patch ?? null,
        rationale: suggested?.rationale ?? null,
        triggered_by_model: top[0]?.model ?? null,
        status: "open",
      });

      alerts.push({ slug: pkg.slug, severity, delta });
    }

    return { ok: true as const, alerts };
  });
