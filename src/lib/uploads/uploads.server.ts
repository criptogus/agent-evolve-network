// Shared bulk-upload pipeline used by both the UI server fn and the MCP tool.
import { generateDraft, insertDraftPackage, inferType } from "@/lib/admin/author.server";

export type UploadFileInput = {
  name: string;
  content: string;
  type?: "skill" | "playbook" | "soul" | "guardrail";
};

export type UploadResult = {
  name: string;
  ok: boolean;
  package_id?: string;
  slug?: string;
  type?: string;
  forge_report_url?: string;
  error?: string;
};

/**
 * Process a batch of uploaded skill files. Each file becomes a draft package
 * owned by `userId`. Drafts are NOT auto-published — admins or the author can
 * publish later from /admin or via the forge loop.
 */
export async function processBulkUpload(
  supabase: any,
  userId: string,
  files: UploadFileInput[],
  opts?: { publish?: boolean }
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (const f of files) {
    const out: UploadResult = { name: f.name, ok: false };
    try {
      const inferred = f.type ?? inferType(f.name, f.content);
      const brief =
        `File: ${f.name}\n\n` +
        `Content:\n${f.content.slice(0, 8000)}\n\n` +
        `Goal: parse, normalise and refine into a production-grade ${inferred} ` +
        `using SkillForge proprietary standards. Categorise by industry/technology where evident.`;
      const draft = await generateDraft(brief, inferred);
      const pkg = await insertDraftPackage(supabase, userId, draft, {
        source_kind: "markdown",
        source_ref: `upload:${f.name}`,
        publish: !!opts?.publish,
      });
      out.ok = true;
      out.package_id = pkg.id;
      out.slug = pkg.slug;
      out.type = inferred;
      out.forge_report_url = `/forge/report/${pkg.slug}`;
    } catch (e: any) {
      out.error = e?.message ?? "failed";
    }
    results.push(out);
  }
  return results;
}
