import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { processBulkUpload, type UploadResult } from "./uploads.server";

const FileSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(20).max(120_000),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
});

const Input = z.object({
  files: z.array(FileSchema).min(1).max(10),
});

/**
 * Authenticated bulk skills upload. Each file becomes a draft package owned
 * by the calling user. Returns one result row per file.
 */
export const bulkUploadPackages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ results: UploadResult[]; queued: Array<{ id: string; filename: string; inferred_type: string }> }> => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { results, queued } = await processBulkUpload(supabase as any, userId, data.files);
    return { results, queued };
  });
