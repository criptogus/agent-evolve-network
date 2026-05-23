import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { processBulkUpload } from "@/lib/uploads/uploads.server";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyBearer, extractBearer } from "@/lib/auth/bearer.server";

const supabaseAdmin = _supabaseAdmin as any;

// REST counterpart of the MCP `upload_packages` tool. Advertised on the
// /account/tokens page snippets. Always inserts as PRIVATE drafts —
// `publish:true` is accepted in the body for forward compatibility but
// ignored; publishing the marketplace requires an explicit action in
// /account/packages followed by an admin review.

const BodySchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        content: z.string().min(1).max(200_000),
        type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
      })
    )
    .min(1)
    .max(10),
  publish: z.boolean().optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS,
      ...(init.headers ?? {}),
    },
  });
}

async function handle(request: Request): Promise<Response> {
  const token = extractBearer(request);
  if (!token) {
    return json(
      { error: "unauthorized", hint: "Send Authorization: Bearer <sas_… token from /account/tokens>." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }
  const auth = await verifyBearer(token);
  if (!auth) {
    return json(
      { error: "unauthorized", hint: "Token rejected. Mint a fresh one at /account/tokens." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", hint: "Body must be JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { files, publish } = parsed.data;
  try {
    const { results, queued } = await processBulkUpload(supabaseAdmin, auth.user_id, files);
    const ok = results.filter((r) => r.ok).length;
    const failed = results.length - ok;
    return json({
      uploaded: ok,
      failed,
      queued_count: queued.length,
      visibility: "private_draft",
      publish_ignored: publish === true ? "Public listing requires admin review — submit from /account/packages." : undefined,
      next_step:
        queued.length > 0
          ? `Processed ${ok} inline; ${queued.length} more queued. Background worker drains within ~1 minute — see /account/packages.`
          : ok > 0
            ? "Open /account/packages to submit a draft for admin review."
            : "All files failed to normalise. See `results[].error` for the cause.",
      results,
      queued,
    });
  } catch (e: any) {
    console.error("[api/packages/upload] fatal:", e);
    return json({ error: "internal", message: e?.message ?? String(e) }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/packages/upload")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => handle(request),
    },
  },
});
