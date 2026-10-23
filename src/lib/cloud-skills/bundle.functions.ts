import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePaidSubscription } from "./subscription-guard";
import { PROVIDER_IDS } from "./providers";

const ExportBundleInput = z.object({
  tool: z.string().refine((v) => PROVIDER_IDS.includes(v), "Unknown tool"),
  scope: z.enum(["project", "global"]),
  /** Empty = every skill in the private library. */
  skill_ids: z.array(z.string().uuid()).max(500).default([]),
});

/**
 * Exports the caller's own cloud skills as a private zip, laid out exactly the
 * way the chosen agent tool reads skills from disk. Only the caller's rows are
 * ever included (no public skills, no other accounts).
 */
export const exportSkillBundle = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => ExportBundleInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    let q = supabase
      .from("cloud_skills")
      .select("slug, name, description, category, tags, version, content")
      .eq("user_id", userId)
      .order("slug", { ascending: true })
      .limit(500);
    if (data.skill_ids.length) q = q.in("id", data.skill_ids);

    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    if (!rows?.length) throw new Response("No skills to export", { status: 400 });

    const { buildBundleFiles, bundleFileName, bundlePath } = await import("./bundle");
    const { zipBundle, toBase64 } = await import("./bundle.server");

    const { provider, files } = buildBundleFiles(data.tool, data.scope, rows);
    const bytes = await zipBundle(files);

    const { recordSyncEvent } = await import("./sync-log.server");
    await recordSyncEvent(supabase, userId, {
      source: "zip_export",
      provider: provider.id,
      provider_label: provider.label,
      scope: data.scope,
      strategy: null,
      client_name: "Web (private .zip export)",
      skill_count: rows.length,
      bytes: bytes.length,
      changes: rows.map((r: any) => ({
        slug: r.slug,
        path: bundlePath(provider, data.scope, r.slug) ?? r.slug,
        action: "write",
        version: r.version ?? null,
        note: "packaged into the zip",
      })),
    });

    return {
      filename: bundleFileName(provider.id, data.scope, rows.length),
      base64: toBase64(bytes),
      bytes: bytes.length,
      tool: { id: provider.id, label: provider.label },
      scope: data.scope,
      skill_count: rows.length,
      paths: files.map((f) => f.path),
    };
  });
