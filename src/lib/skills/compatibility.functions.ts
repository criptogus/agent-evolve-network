import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { COMPAT_MODELS, probeCompatibility } from "./compatibility.server";

const SweepInput = z.object({
  slug: z.string().min(1),
  models: z.array(z.string()).optional(),
  max_cases: z.number().int().min(1).max(8).default(5),
});

export const runCompatibilitySweep = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => SweepInput.parse(d))
  .handler(async ({ data }) => {
    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg) throw new Response("Package not found", { status: 404 });

    const { data: ver } = await supabaseAdmin
      .from("package_versions")
      .select("version,system_prompt,examples")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ver) throw new Response("No version", { status: 404 });

    const examples =
      (ver.examples as Array<{ title: string; input: string; expected_output: string }>) ?? [];
    if (examples.length === 0) {
      return { ok: false as const, error: "no_examples", inserted: 0 };
    }

    const models = (data.models?.length ? data.models : COMPAT_MODELS) as string[];
    const results = [] as Array<{ model: string; status: string; pass_rate: number; judge_score: number }>;

    for (const model of models) {
      const r = await probeCompatibility({
        systemPrompt: ver.system_prompt,
        examples,
        model,
        maxCases: data.max_cases,
      });
      await supabaseAdmin
        .from("skill_compatibility")
        .upsert(
          {
            package_id: pkg.id,
            package_slug: pkg.slug,
            version: ver.version,
            model,
            pass_rate: Number(r.pass_rate.toFixed(3)),
            total_cases: r.total,
            passed_cases: r.passed,
            judge_score: r.judge_score,
            status: r.status,
            notes: r.notes,
            sample: r.sample,
            evaluated_at: new Date().toISOString(),
          },
          { onConflict: "package_id,model" },
        );
      results.push({
        model,
        status: r.status,
        pass_rate: r.pass_rate,
        judge_score: r.judge_score,
      });
    }

    return { ok: true as const, package: pkg.slug, results };
  });

export const getCompatibility = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("skill_compatibility")
      .select("model,pass_rate,total_cases,passed_cases,judge_score,status,notes,version,evaluated_at")
      .eq("package_slug", data.slug)
      .order("judge_score", { ascending: false });
    return { rows: rows ?? [] };
  });

export const listMyDriftAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: pkgs } = await supabase
      .from("packages")
      .select("id")
      .eq("author_id", userId);
    const ids = (pkgs ?? []).map((p: { id: string }) => p.id);
    if (ids.length === 0) return { alerts: [] };
    const { data } = await supabase
      .from("skill_drift_alerts")
      .select("*")
      .in("package_id", ids)
      .order("detected_at", { ascending: false })
      .limit(50);
    return { alerts: data ?? [] };
  });
