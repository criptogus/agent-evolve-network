import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatorPipeline } from "./pipelines.server";

const Input = z.object({
  package_slug: z.string(),
  version: z.string().optional(),
  extra_cases: z
    .array(z.object({ title: z.string(), input: z.string(), expected_output: z.string() }))
    .default([]),
  persist: z.boolean().default(true),
});

export const evaluatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pkg, error: pErr } = await supabase
      .from("packages")
      .select("*")
      .eq("slug", data.package_slug)
      .single();
    if (pErr || !pkg) throw new Response("Package not found", { status: 404 });

    const verQuery = supabase.from("package_versions").select("*").eq("package_id", pkg.id);
    const { data: ver, error: vErr } = data.version
      ? await verQuery.eq("version", data.version).maybeSingle()
      : await verQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (vErr || !ver) throw new Response("Version not found", { status: 404 });

    const result = await evaluatorPipeline({
      pkg: { name: pkg.name, type: pkg.type, description: pkg.description },
      version: {
        system_prompt: ver.system_prompt,
        rules: ver.rules,
        examples: (ver.examples as Array<{ title: string; input: string; expected_output: string }>) || [],
      },
      extraCases: data.extra_cases,
    });

    if (data.persist) {
      await supabase.from("package_evaluations").insert({
        package_id: pkg.id,
        version_id: ver.id,
        triggered_by: userId,
        trigger_kind: "manual",
        overall_score: result.evaluation.overall_score,
        precision_score: result.evaluation.precision,
        health_score: result.evaluation.health,
        hallucination_rate: result.evaluation.hallucination_rate,
        safety_score: result.evaluation.safety,
        verdict: result.evaluation.verdict,
        strengths: result.evaluation.strengths,
        weaknesses: result.evaluation.weaknesses,
        improvement_actions: result.evaluation.improvement_actions,
        example_results: result.evaluation.example_results,
        adversarial_results: { probes: result.adversarial, trigger_rate: result.triggerRate },
        pipeline_stages: result.stages,
      });
    }

    return { package: pkg, version: ver, ...result };
  });
