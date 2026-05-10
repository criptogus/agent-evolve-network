import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatorPipeline, autoLearnPipeline, authorPipeline } from "./pipelines.server";
import { webResearch } from "@/lib/admin/research.server";

/* ============================================================
 * runForgeLoop — Eval → Learn → (Hot-swap) → Re-Eval
 * The unified continuous-evolution loop for any package.
 * ============================================================ */
const LoopInput = z.object({
  package_slug: z.string(),
  hotswap: z.boolean().default(false),
});

export const runForgeLoop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LoopInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pkg } = await supabase.from("packages").select("*").eq("slug", data.package_slug).single();
    if (!pkg) throw new Response("Package not found", { status: 404 });

    const { data: ver } = await supabase
      .from("package_versions")
      .select("*")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ver) throw new Response("Version not found", { status: 404 });

    // 1) Evaluate current
    const before = await evaluatorPipeline({
      pkg: { name: pkg.name, type: pkg.type },
      version: {
        system_prompt: ver.system_prompt,
        rules: ver.rules,
        examples: (ver.examples as Array<{ title: string; input: string; expected_output: string }>) || [],
      },
    });
    await supabase.from("package_evaluations").insert({
      package_id: pkg.id,
      version_id: ver.id,
      triggered_by: userId,
      trigger_kind: "loop:before",
      overall_score: before.evaluation.overall_score,
      precision_score: before.evaluation.precision,
      health_score: before.evaluation.health,
      hallucination_rate: before.evaluation.hallucination_rate,
      safety_score: before.evaluation.safety,
      verdict: before.evaluation.verdict,
      strengths: before.evaluation.strengths,
      weaknesses: before.evaluation.weaknesses,
      improvement_actions: before.evaluation.improvement_actions,
      example_results: before.evaluation.example_results,
      adversarial_results: before.adversarial,
      pipeline_stages: before.stages,
    });

    // 2) Auto-learn proposal
    const { data: metrics } = await supabase
      .from("package_metrics_daily")
      .select("*")
      .eq("package_id", pkg.id)
      .order("day", { ascending: false })
      .limit(30);
    const { data: learnings } = await supabase
      .from("learnings")
      .select("kind, evidence, suggested_patch, weight, created_at")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(80);

    const learn = await autoLearnPipeline({
      pkg: { name: pkg.name, type: pkg.type },
      version: { version: ver.version, system_prompt: ver.system_prompt, rules: ver.rules, examples: ver.examples },
      metrics: metrics || [],
      learnings: (learnings || []) as Array<{
        kind: string;
        evidence: unknown;
        suggested_patch: string | null;
        weight: number;
        created_at: string;
      }>,
    });

    // 3) Hot-swap (only if requested AND no regression AND verdict suggests change is needed)
    let newVersion: { id: string; version: string } | null = null;
    let after: Awaited<ReturnType<typeof evaluatorPipeline>> | null = null;

    const shouldSwap =
      data.hotswap &&
      !learn.regression &&
      (before.evaluation.verdict !== "ship" || before.evaluation.overall_score < 90);

    if (shouldSwap) {
      const mergedRules = JSON.parse(
        JSON.stringify({ ...(ver.rules as object), ...(learn.patch.patched_rules as object) })
      );
      const existingExamples = Array.isArray(ver.examples) ? (ver.examples as unknown[]) : [];
      const mergedExamples = JSON.parse(JSON.stringify([...existingExamples, ...learn.patch.new_examples]));
      const { data: nv } = await supabase
        .from("package_versions")
        .insert({
          package_id: pkg.id,
          version: learn.patch.next_version,
          status: "beta",
          notes: `Forge loop hot-swap · ${learn.patch.rationale}`.slice(0, 500),
          system_prompt: learn.patch.patched_system_prompt,
          rules: mergedRules,
          examples: mergedExamples,
          compatibility: ver.compatibility,
          parent_version_id: ver.id,
        })
        .select()
        .single();
      newVersion = nv as { id: string; version: string };

      // 4) Re-evaluate the new version
      after = await evaluatorPipeline({
        pkg: { name: pkg.name, type: pkg.type },
        version: {
          system_prompt: learn.patch.patched_system_prompt,
          rules: mergedRules,
          examples: mergedExamples,
        },
      });
      await supabase.from("package_evaluations").insert({
        package_id: pkg.id,
        version_id: newVersion.id,
        triggered_by: userId,
        trigger_kind: "loop:after",
        overall_score: after.evaluation.overall_score,
        precision_score: after.evaluation.precision,
        health_score: after.evaluation.health,
        hallucination_rate: after.evaluation.hallucination_rate,
        safety_score: after.evaluation.safety,
        verdict: after.evaluation.verdict,
        strengths: after.evaluation.strengths,
        weaknesses: after.evaluation.weaknesses,
        improvement_actions: after.evaluation.improvement_actions,
        example_results: after.evaluation.example_results,
        adversarial_results: after.adversarial,
        pipeline_stages: after.stages,
      });
    }

    return {
      package: pkg,
      base_version: ver,
      before: before.evaluation,
      patch: learn.patch,
      regression: learn.regression,
      hotswapped: !!newVersion,
      new_version: newVersion,
      after: after?.evaluation ?? null,
      stages: {
        evaluate: before.stages,
        learn: learn.stages,
        re_evaluate: after?.stages ?? [],
      },
    };
  });

/* ============================================================
 * autoCreateMissing — when a customer searches for a primitive
 * that does not exist, research → author → evaluate → publish.
 * ============================================================ */
const CreateInput = z.object({
  brief: z.string().min(10).max(2000),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  vertical: z.string().max(80).optional(),
});

export const autoCreateMissing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Log the request first
    const { data: req } = await supabase
      .from("package_requests")
      .insert({
        requester_id: userId,
        kind: data.type,
        industry: data.vertical ?? null,
        brief: data.brief,
        status: "researching",
      })
      .select()
      .single();

    // Research → author
    const research = await webResearch(data.brief, data.type).catch(() => null);
    const grounding = research
      ? `${research.summary}\n\nKey concepts: ${research.key_concepts.join(", ")}\nBest practices: ${research.best_practices.join(" | ")}`
      : undefined;

    const { draft, stages } = await authorPipeline({
      brief: data.brief,
      type: data.type,
      vertical: data.vertical,
      groundingHint: grounding,
    });

    // unique slug
    let slug = draft.slug;
    let n = 1;
    while (true) {
      const { data: existing } = await supabase.from("packages").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      n += 1;
      slug = `${draft.slug}-${n}`;
      if (n > 50) break;
    }

    const { data: pkg } = await supabase
      .from("packages")
      .insert({
        slug,
        name: draft.name,
        type: draft.type,
        description: draft.description,
        long_description: draft.long_description,
        author_id: userId,
        author_handle: "@auto",
        author_verified: false,
        is_published: true,
        latest_version: "0.1.0",
        scopes: draft.scopes,
        source_kind: "request",
        source_ref: req?.id ?? "auto",
      })
      .select()
      .single();
    if (!pkg) throw new Response("Failed to create package", { status: 500 });

    await supabase.from("package_versions").insert({
      package_id: pkg.id,
      version: "0.1.0",
      status: "beta",
      notes: `Auto-created on demand · ${stages.map((s) => s.name).join(" → ")}`,
      system_prompt: draft.system_prompt,
      rules: draft.rules,
      examples: draft.examples,
      compatibility: draft.compatibility,
    });

    // Quick eval to seed metrics
    const evalRes = await evaluatorPipeline({
      pkg: { name: pkg.name, type: pkg.type },
      version: { system_prompt: draft.system_prompt, rules: draft.rules, examples: draft.examples },
    }).catch(() => null);

    if (evalRes) {
      await supabase.from("package_evaluations").insert({
        package_id: pkg.id,
        triggered_by: userId,
        trigger_kind: "auto-create",
        overall_score: evalRes.evaluation.overall_score,
        precision_score: evalRes.evaluation.precision,
        health_score: evalRes.evaluation.health,
        hallucination_rate: evalRes.evaluation.hallucination_rate,
        safety_score: evalRes.evaluation.safety,
        verdict: evalRes.evaluation.verdict,
        strengths: evalRes.evaluation.strengths,
        weaknesses: evalRes.evaluation.weaknesses,
        improvement_actions: evalRes.evaluation.improvement_actions,
        example_results: evalRes.evaluation.example_results,
        adversarial_results: evalRes.adversarial,
        pipeline_stages: evalRes.stages,
      });
    }

    if (req) {
      await supabase
        .from("package_requests")
        .update({
          status: "fulfilled",
          generated_package_id: pkg.id,
          research_summary: research?.summary ?? null,
          evaluation: evalRes?.evaluation ?? null,
          auto_resolved: true,
        })
        .eq("id", req.id);
    }

    return {
      package: pkg,
      research_used: !!research,
      evaluation: evalRes?.evaluation ?? null,
      stages,
    };
  });
