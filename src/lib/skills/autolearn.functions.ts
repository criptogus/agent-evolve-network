import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { autoLearnPipeline } from "./pipelines.server";
import { createFeedbackRequest } from "./feedback.functions";

const Input = z.object({
  package_slug: z.string(),
  apply: z.boolean().default(false),
});

export const autoLearnPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx, userId } = context as any;
    const supabase = _sbCtx as any;

    const { data: pkg, error: pErr } = await supabase
      .from("packages")
      .select("*")
      .eq("slug", data.package_slug)
      .single();
    if (pErr || !pkg) throw new Response("Package not found", { status: 404 });

    const { data: ver } = await supabase
      .from("package_versions")
      .select("*")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ver) throw new Response("Current version not found", { status: 404 });

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

    const result = await autoLearnPipeline({
      pkg: { name: pkg.name, type: pkg.type },
      version: {
        version: ver.version,
        system_prompt: ver.system_prompt,
        rules: ver.rules,
        examples: ver.examples,
      },
      metrics: metrics || [],
      learnings: (learnings || []) as Array<{
        kind: string;
        evidence: unknown;
        suggested_patch: string | null;
        weight: number;
        created_at: string;
      }>,
    });

    let createdVersion: { id: string; version: string; status: string } | null = null;
    if (data.apply && !result.regression) {
      const mergedRules = JSON.parse(
        JSON.stringify({ ...(ver.rules as object), ...(result.patch.patched_rules as object) })
      );
      const existingExamples = Array.isArray(ver.examples) ? (ver.examples as unknown[]) : [];
      const mergedExamples = JSON.parse(JSON.stringify([...existingExamples, ...result.patch.new_examples]));
      const { data: nv, error: nvErr } = await supabase
        .from("package_versions")
        .insert({
          package_id: pkg.id,
          version: result.patch.next_version,
          status: "beta",
          notes: `Auto-learned · ${result.patch.rationale}`.slice(0, 500),
          system_prompt: result.patch.patched_system_prompt,
          rules: mergedRules,
          examples: mergedExamples,
          compatibility: ver.compatibility,
          parent_version_id: ver.id,
        })
        .select()
        .single();
      if (nvErr) throw new Response(`Apply patch failed: ${nvErr.message}`, { status: 500 });
      createdVersion = nv as { id: string; version: string; status: string };

      await supabase
        .from("learnings")
        .update({ applied_in_version_id: createdVersion.id })
        .eq("package_id", pkg.id)
        .is("applied_in_version_id", null);
    }

    const feedback_request = await createFeedbackRequest(supabase, {
      kind: "autolearn",
      packageId: pkg.id,
      versionId: createdVersion?.id ?? ver.id,
      sourceUserId: userId,
      source: "ui",
      context: {
        applied: !!createdVersion,
        next_version: result.patch?.next_version,
        confidence: result.patch?.confidence,
      },
    });

    return { package: pkg, current_version: ver, ...result, applied: createdVersion, feedback_request };
  });
