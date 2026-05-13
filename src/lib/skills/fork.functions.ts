import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ForkInput = z.object({
  source_slug: z.string().min(2).max(120),
  fork_kind: z.enum(["fork", "adaptation", "translation", "derivative"]).default("fork"),
  rev_share_bps: z.number().int().min(0).max(5000).default(500),  // up to 50% — sane cap
  new_slug: z.string().regex(/^[a-z0-9-]{2,64}$/).optional(),
  new_name: z.string().min(2).max(120).optional(),
});

/**
 * Forks a published package into a new draft owned by the caller and records
 * the lineage edge so the upstream author is paid `rev_share_bps` of every
 * future sale on the fork. The new package always starts unpublished.
 */
export const forkPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ForkInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sb, userId } = context;
    const supabase = _sb as any;

    const { data: parent, error: pErr } = await supabase
      .from("packages")
      .select("id,slug,name,type,description,long_description,license,author_handle,latest_version,is_published")
      .eq("slug", data.source_slug)
      .maybeSingle();
    if (pErr || !parent) throw new Response("source package not found", { status: 404 });
    if (!parent.is_published) throw new Response("only published packages can be forked", { status: 403 });

    const newSlug = data.new_slug ?? `${parent.slug}-fork-${Math.random().toString(36).slice(2, 6)}`;
    const newName = data.new_name ?? `${parent.name} (fork)`;

    const { data: existing } = await supabase
      .from("packages").select("id").eq("slug", newSlug).maybeSingle();
    if (existing) throw new Response("slug already exists", { status: 409 });

    // Carry over the latest version's content into the new draft.
    const { data: srcVer } = await supabase
      .from("package_versions")
      .select("system_prompt,rules,examples,version")
      .eq("package_id", parent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: child, error: cErr } = await supabase
      .from("packages")
      .insert({
        slug: newSlug,
        name: newName,
        type: parent.type,
        description: `Fork of ${parent.slug}: ${parent.description}`.slice(0, 280),
        long_description: parent.long_description,
        license: parent.license,
        owner_id: userId,
        is_published: false,
        forked_from_slug: parent.slug,
      })
      .select("id,slug")
      .single();
    if (cErr || !child) throw new Response(cErr?.message ?? "insert failed", { status: 500 });

    if (srcVer) {
      await supabase.from("package_versions").insert({
        package_id: child.id,
        version: "0.1.0",
        system_prompt: srcVer.system_prompt,
        rules: srcVer.rules,
        examples: srcVer.examples,
      });
    }

    // Record lineage so the upstream author shares revenue (Phase 2 viral loop).
    const { error: lErr } = await supabase.from("package_lineage").insert({
      child_package_id: child.id,
      parent_package_id: parent.id,
      fork_kind: data.fork_kind,
      rev_share_bps: data.rev_share_bps,
      attributed_by: userId,
    });
    if (lErr) {
      // Roll back the new package to keep lineage strictly consistent.
      await supabase.from("packages").delete().eq("id", child.id);
      throw new Response(`lineage attribution failed: ${lErr.message}`, { status: 500 });
    }

    return {
      ok: true,
      child: { id: child.id, slug: child.slug },
      parent: { id: parent.id, slug: parent.slug },
      rev_share_bps: data.rev_share_bps,
      fork_kind: data.fork_kind,
    };
  });
