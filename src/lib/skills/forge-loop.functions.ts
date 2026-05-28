import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatorPipeline, autoLearnPipeline, authorPipeline } from "./pipelines.server";
import { webResearch } from "@/lib/admin/research.server";
import { createFeedbackRequest } from "./feedback.functions";

/* ============================================================
 * runForgeLoop — Eval → Learn → (Hot-swap) → Re-Eval
 * The unified continuous-evolution loop for any package.
 * ============================================================ */
const LoopInput = z.object({
  package_slug: z.string(),
  hotswap: z.boolean().default(false),
  // SkillOpt-style training controls: epochs iterate the eval→learn→re-eval
  // loop, each epoch validating a patch on a rotating mini-batch of golden
  // cases. The single best snapshot across all epochs is promoted at the end.
  epochs: z.number().int().min(1).max(6).default(1),
  batch_size: z.number().int().min(1).max(20).default(8),
  candidates_per_gen: z.number().int().min(1).max(4).default(2),
});

/** Summarize real agent runs into the trajectory-driven learning signal. */
async function buildExecutionSignal(supabase: any, packageId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("skill_executions")
    .select("success, error_kind, model")
    .eq("package_id", packageId)
    .gte("created_at", since)
    .limit(2000);
  const execs = (rows as Array<{ success: boolean; error_kind: string | null; model: string | null }>) || [];
  if (execs.length === 0) return null;
  const failures = execs.filter((e) => !e.success).length;
  const errorCounts = new Map<string, number>();
  const modelStats = new Map<string, { runs: number; ok: number }>();
  for (const e of execs) {
    if (e.error_kind) errorCounts.set(e.error_kind, (errorCounts.get(e.error_kind) ?? 0) + 1);
    const m = e.model ?? "unknown";
    const s = modelStats.get(m) ?? { runs: 0, ok: 0 };
    s.runs += 1;
    if (e.success) s.ok += 1;
    modelStats.set(m, s);
  }
  return {
    total: execs.length,
    failures,
    success_rate: Math.round(((execs.length - failures) / execs.length) * 100) / 100,
    top_error_kinds: [...errorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([kind, count]) => ({ kind, count })),
    by_model: [...modelStats.entries()].map(([model, s]) => ({
      model,
      runs: s.runs,
      success_rate: Math.round((s.ok / s.runs) * 100) / 100,
    })),
  };
}

export const runForgeLoop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LoopInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;

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

    const { data: goldenRows } = await supabase
      .from("package_golden_cases")
      .select("title, input, expected_output, label_pass, label_source")
      .eq("package_id", pkg.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(20);
    const goldenCases =
      (goldenRows as Array<{ title: string; input: string; expected_output: string; label_pass: boolean; label_source: string }>) || [];

    // Shared learning signals (fetched once for the whole training run).
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
    const { data: feedback } = await supabase
      .from("package_feedback")
      .select("source, rating, sentiment, comments, agent_model")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(120);
    const executions = await buildExecutionSignal(supabase, pkg.id);

    // 1) Baseline evaluation on the full golden set.
    const before = await evaluatorPipeline({
      pkg: { name: pkg.name, type: pkg.type },
      version: {
        system_prompt: ver.system_prompt,
        rules: ver.rules,
        examples: (ver.examples as Array<{ title: string; input: string; expected_output: string }>) || [],
      },
      goldenCases,
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
      judge_calibration: before.judgeCalibration,
    });

    // best_skill snapshot — the running champion across all epochs.
    type Snapshot = {
      system_prompt: string;
      rules: unknown;
      examples: unknown[];
      score: number;
      from_version: string;
      rationale: string;
    };
    let best: Snapshot = {
      system_prompt: ver.system_prompt,
      rules: ver.rules,
      examples: Array.isArray(ver.examples) ? (ver.examples as unknown[]) : [],
      score: before.evaluation.overall_score,
      from_version: ver.version,
      rationale: "baseline",
    };

    // Mini-batch the golden cases per epoch (rotating window) so each epoch
    // validates on a different slice — like SGD mini-batches over a dataset.
    const batchSize = Math.min(data.batch_size, Math.max(1, goldenCases.length || data.batch_size));
    const miniBatch = (epoch: number) => {
      if (goldenCases.length === 0) return [];
      const start = (epoch * batchSize) % goldenCases.length;
      const slice = goldenCases.slice(start, start + batchSize);
      return slice.length >= batchSize ? slice : [...slice, ...goldenCases.slice(0, batchSize - slice.length)];
    };

    // Auto-learn proposal is generated fresh each epoch from the running
    // champion, so improvements compound. With multiple epochs we run a single
    // generation per epoch (the epoch loop is the outer search).
    let lastLearn: Awaited<ReturnType<typeof autoLearnPipeline>> | null = null;
    const epochHistory: Array<{
      epoch: number;
      batch: number;
      regression: boolean;
      candidate_score: number | null;
      accepted: boolean;
      best_score: number;
      rationale: string;
    }> = [];

    for (let epoch = 0; epoch < data.epochs; epoch++) {
      const learn = await autoLearnPipeline({
        pkg: { name: pkg.name, type: pkg.type },
        version: {
          version: best.from_version,
          system_prompt: best.system_prompt,
          rules: best.rules,
          examples: best.examples,
        },
        metrics: metrics || [],
        learnings: (learnings || []) as Array<{
          kind: string;
          evidence: unknown;
          suggested_patch: string | null;
          weight: number;
          created_at: string;
        }>,
        feedback: (feedback || []) as Array<{
          source: string;
          rating: number | null;
          sentiment: string | null;
          comments: string | null;
          agent_model: string | null;
        }>,
        executions,
        generations: data.epochs > 1 ? 1 : 2,
        candidatesPerGen: data.candidates_per_gen,
      });
      lastLearn = learn;

      if (learn.regression) {
        epochHistory.push({
          epoch,
          batch: batchSize,
          regression: true,
          candidate_score: null,
          accepted: false,
          best_score: best.score,
          rationale: learn.patch.rationale,
        });
        continue;
      }

      // Form the candidate and validate it on this epoch's mini-batch.
      const mergedRules = JSON.parse(
        JSON.stringify({ ...(best.rules as object), ...(learn.patch.patched_rules as object) })
      );
      const mergedExamples = JSON.parse(JSON.stringify([...best.examples, ...learn.patch.new_examples]));
      const batch = miniBatch(epoch);
      const candEval = await evaluatorPipeline({
        pkg: { name: pkg.name, type: pkg.type },
        version: { system_prompt: learn.patch.patched_system_prompt, rules: mergedRules, examples: mergedExamples },
        goldenCases: batch.length > 0 ? batch : undefined,
      });
      const candScore = candEval.evaluation.overall_score;
      const accepted = candScore > best.score;
      if (accepted) {
        best = {
          system_prompt: learn.patch.patched_system_prompt,
          rules: mergedRules,
          examples: mergedExamples,
          score: candScore,
          from_version: learn.patch.next_version,
          rationale: learn.patch.rationale,
        };
      }
      epochHistory.push({
        epoch,
        batch: batch.length,
        regression: false,
        candidate_score: candScore,
        accepted,
        best_score: best.score,
        rationale: learn.patch.rationale,
      });
    }

    // 3) Promote the champion (validation gate on the FULL golden set).
    let newVersion: { id: string; version: string } | null = null;
    let after: Awaited<ReturnType<typeof evaluatorPipeline>> | null = null;
    const improved = best.from_version !== ver.version;
    const shouldSwap =
      data.hotswap &&
      improved &&
      (before.evaluation.verdict !== "ship" || before.evaluation.overall_score < 90);

    if (shouldSwap) {
      // Final validation on the full golden set before persisting.
      after = await evaluatorPipeline({
        pkg: { name: pkg.name, type: pkg.type },
        version: { system_prompt: best.system_prompt, rules: best.rules, examples: best.examples },
        goldenCases,
      });
      // Hard gate: never deploy a champion that regresses on the full set.
      if (after.evaluation.overall_score >= before.evaluation.overall_score) {
        const { data: nv } = await supabase
          .from("package_versions")
          .insert({
            package_id: pkg.id,
            version: best.from_version,
            status: "beta",
            notes: `Forge loop (${data.epochs} epochs) · ${best.rationale}`.slice(0, 500),
            system_prompt: best.system_prompt,
            rules: best.rules,
            examples: best.examples,
            compatibility: ver.compatibility,
            parent_version_id: ver.id,
          })
          .select()
          .single();
        newVersion = nv as { id: string; version: string };

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
          judge_calibration: after.judgeCalibration,
          evolution_trace: {
            evolution: lastLearn?.evolution,
            feedback_summary: lastLearn?.feedback_summary,
            epoch_history: epochHistory,
            executions,
          },
        });
      } else {
        // Champion failed the full-set gate — discard it.
        newVersion = null;
      }
    }

    const feedback_request = await createFeedbackRequest(supabase, {
      kind: "forge_loop",
      packageId: pkg.id,
      versionId: newVersion?.id ?? ver.id,
      sourceUserId: userId,
      source: "ui",
      context: { hotswapped: !!newVersion, before_score: before.evaluation.overall_score, after_score: after?.evaluation.overall_score ?? null },
    });

    return {
      package: pkg,
      base_version: ver,
      before: before.evaluation,
      patch: lastLearn?.patch ?? null,
      regression: lastLearn?.regression ?? true,
      hotswapped: !!newVersion,
      new_version: newVersion,
      after: after?.evaluation ?? null,
      training: {
        epochs: data.epochs,
        batch_size: batchSize,
        candidates_per_gen: data.candidates_per_gen,
        best_score: best.score,
        baseline_score: before.evaluation.overall_score,
        executions_used: !!executions,
        epoch_history: epochHistory,
      },
      stages: {
        evaluate: before.stages,
        learn: lastLearn?.stages ?? [],
        re_evaluate: after?.stages ?? [],
      },
      feedback_request,
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
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;

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

    const feedback_request = await createFeedbackRequest(supabase, {
      kind: "autocreate",
      packageId: pkg.id,
      sourceUserId: userId,
      source: "ui",
      context: { brief: data.brief.slice(0, 200), type: data.type },
    });

    return {
      package: pkg,
      research_used: !!research,
      evaluation: evalRes?.evaluation ?? null,
      stages,
      feedback_request,
    };
  });
