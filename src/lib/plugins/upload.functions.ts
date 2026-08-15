import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";

const ZipInput = z.object({
  filename: z.string().max(200).default("plugin.zip"),
  /** base64-encoded .zip, capped at ~8 MB of base64 text. */
  zip_base64: z.string().min(4).max(11_000_000),
});

/** Dry run: unzip + full Agent Plugins v1 conformance suite. Writes nothing. */
export const validatePluginUpload = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => ZipInput.parse(d))
  .handler(async ({ data }) => {
    const { validateZipPayload } = await import("./upload.server");
    const { report } = await validateZipPayload(data.zip_base64);
    return { filename: data.filename, report };
  });

const PublishInput = ZipInput.extend({
  /** When false the plugin lands as a private draft instead of going live. */
  publish: z.boolean().default(false),
});

/**
 * Re-validates the archive server-side and only then writes it to the registry.
 * A non-conformant package can never reach /plugins through this path.
 */
export const publishPluginUpload = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { validateZipPayload, pluginToDraft } = await import("./upload.server");
    const { insertDraftPackage } = await import("@/lib/admin/author.server");
    const { runPluginConformance } = await import("./conformance");

    const { files } = await validateZipPayload(data.zip_base64);
    const fileMap = new Map(Object.entries(files));
    const report = runPluginConformance(fileMap);
    if (!report.conformant) {
      return { ok: false as const, report, package: null, published: false };
    }

    const draft = pluginToDraft(fileMap, report);
    const pkg = await insertDraftPackage(supabase, userId, draft, {
      source_kind: "markdown",
      source_ref: `agent-plugin:${data.filename}`,
    });

    let published = false;
    if (data.publish) {
      const { error } = await supabase
        .from("packages")
        .update({
          is_published: true,
          review_status: "approved",
          reviewed_at: new Date().toISOString(),
          review_notes: "Agent Plugins v1 conformance suite passed on admin upload.",
        })
        .eq("id", pkg.id);
      if (error) throw new Response(`Publish failed: ${error.message}`, { status: 500 });
      published = true;
    }

    await supabase.from("plugin_conformance_runs").insert({
      created_by: userId,
      filename: data.filename,
      plugin_name: report.manifest?.name ?? draft.slug,
      package_id: pkg.id,
      conformant: true,
      published,
      report: report.checks,
    });

    return { ok: true as const, report, package: { id: pkg.id, slug: pkg.slug }, published };
  });
