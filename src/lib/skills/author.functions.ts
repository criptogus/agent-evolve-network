import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGatewayModel } from "@/lib/ai-gateway";
import { PackageDraftSchema } from "./schemas";

const Input = z.object({
  brief: z.string().min(20).max(4000),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  vertical: z.string().max(80).optional(),
  publish: z.boolean().default(false),
});

const META_SYSTEM = `You are SkillForge Author, a proprietary meta-agent that designs production-grade agent packages.
You output strict JSON conforming to the PackageDraft schema. Each package must be:
- Executable: system_prompt is a complete operational instruction set with explicit reasoning steps, tools usage, output format.
- Verifiable: rules.input_schema/output_schema use JSON-schema-like fields; must/must_not are testable invariants.
- Realistic: examples cover the happy path, an edge case, and a failure-recovery case with full expected_output.
- Domain-specific: no generic platitudes; reflect the brief's vertical, tools, and constraints.

Type semantics:
- skill: a capability (how to do X).
- playbook: a multi-step decision flow with state transitions.
- soul: a personality/values layer that shapes tone and judgment.
- guardrail: hard safety boundary with detection + redaction/block actions.

Use clear, terse language. No filler. The slug must be lowercase-kebab.`;

export const authorPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const model = getGatewayModel("google/gemini-3-flash-preview");

    const prompt = `Brief:\n${data.brief}\n\nType: ${data.type}${data.vertical ? `\nVertical: ${data.vertical}` : ""}\n\nDesign a complete ${data.type} package. Return ONLY the JSON.`;

    const { experimental_output } = await generateText({
      model,
      system: META_SYSTEM,
      prompt,
      experimental_output: Output.object({ schema: PackageDraftSchema }),
    });

    const draft = experimental_output;
    if (draft.type !== data.type) draft.type = data.type;

    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .insert({
        slug: draft.slug,
        name: draft.name,
        type: draft.type,
        description: draft.description,
        long_description: draft.long_description,
        author_id: userId,
        author_handle: "@you",
        is_published: data.publish,
        latest_version: "0.1.0",
        scopes: draft.scopes,
      })
      .select()
      .single();
    if (pkgErr) throw new Response(`Insert package failed: ${pkgErr.message}`, { status: 500 });

    const { data: ver, error: verErr } = await supabase
      .from("package_versions")
      .insert({
        package_id: pkg.id,
        version: "0.1.0",
        status: data.publish ? "stable" : "beta",
        notes: "Authored by SkillForge Author",
        system_prompt: draft.system_prompt,
        rules: draft.rules,
        examples: draft.examples,
        compatibility: draft.compatibility,
      })
      .select()
      .single();
    if (verErr) throw new Response(`Insert version failed: ${verErr.message}`, { status: 500 });

    return { package: pkg, version: ver, draft };
  });
