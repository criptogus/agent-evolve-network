import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { authorPipeline } from "./pipelines.server";

const Input = z.object({
  brief: z.string().min(20).max(4000),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  vertical: z.string().max(80).optional(),
  publish: z.boolean().default(false),
});

export const authorPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { draft, research, stages } = await authorPipeline({
      brief: data.brief,
      type: data.type,
      vertical: data.vertical,
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

    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .insert({
        slug,
        name: draft.name,
        type: draft.type,
        description: draft.description,
        long_description: draft.long_description,
        author_id: userId,
        author_handle: "@you",
        is_published: data.publish,
        latest_version: "0.1.0",
        scopes: draft.scopes,
        source_kind: "wizard",
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
        notes: `Authored via multi-stage pipeline · ${stages.map((s) => s.name).join(" → ")}`,
        system_prompt: draft.system_prompt,
        rules: draft.rules,
        examples: draft.examples,
        compatibility: draft.compatibility,
      })
      .select()
      .single();
    if (verErr) throw new Response(`Insert version failed: ${verErr.message}`, { status: 500 });

    return { package: pkg, version: ver, draft, research, stages };
  });
