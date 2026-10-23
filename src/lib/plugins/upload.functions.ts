import { ArtifactFilesSchema, artifactDigest } from "./artifacts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";
import { serializeReport } from "./report-view";

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
    return { filename: data.filename, report: serializeReport(report) };
  });

const PublishInput = ZipInput.extend({
  /** When true, submit for review; conformance alone never publishes the plugin. */
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
    const { supabase, userId } = context;
    const { validateZipPayload, pluginToDraft } = await import("./upload.server");
    const { insertDraftPackage } = await import("@/lib/admin/author.server");
    const { runPluginConformance } = await import("./conformance");

    const { files } = await validateZipPayload(data.zip_base64);
    const fileMap = new Map(Object.entries(files));
    const report = runPluginConformance(fileMap);
    if (!report.conformant) {
      return {
        ok: false as const,
        report: serializeReport(report),
        package: null,
        published: false,
      };
    }

    const completeFiles = ArtifactFilesSchema.parse(files);
    const draft = pluginToDraft(fileMap, report);
    const pkg = await insertDraftPackage(supabase, userId, draft, {
      source_kind: "markdown",
      source_ref: `agent-plugin:${data.filename}`,
      version: report.manifest?.version ?? "0.1.0",
    });

    const { data: version, error: versionError } = await supabase
      .from("package_versions")
      .select("id")
      .eq("package_id", pkg.id)
      .eq("version", pkg.latest_version)
      .single();
    if (versionError || !version) throw new Response("Imported version not found", { status: 500 });
    const { error: artifactError } = await supabase.from("package_artifacts").insert({
      package_id: pkg.id,
      version_id: version.id,
      files: completeFiles,
      sha256: artifactDigest(completeFiles),
      created_by: userId,
    });
    if (artifactError) throw new Response("Could not preserve complete bundle", { status: 500 });
    // Conformance is structural. Publication still requires the version-specific adversarial gate.
    if (data.publish)
      await supabase
        .from("packages")
        .update({ review_status: "pending", submitted_at: new Date().toISOString() })
        .eq("id", pkg.id);
    const published = false;

    await supabase.from("plugin_conformance_runs").insert({
      created_by: userId,
      filename: data.filename,
      plugin_name: report.manifest?.name ?? draft.slug,
      package_id: pkg.id,
      conformant: true,
      published,
      report: report.checks,
    });

    return {
      ok: true as const,
      report: serializeReport(report),
      package: { id: pkg.id as string, slug: pkg.slug as string },
      published,
      submitted_for_review: data.publish,
    };
  });
