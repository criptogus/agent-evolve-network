import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { corsPreflight, jsonResponse, sha256 } from "@/lib/oauth/mcp-oauth.server";

async function parseBody(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return (await request.json()) as Record<string, string>;
    const fd = await request.formData();
    const obj: Record<string, string> = {};
    fd.forEach((v, k) => {
      obj[k] = typeof v === "string" ? v : "";
    });
    return obj;
  } catch {
    return {};
  }
}

export const Route = createFileRoute("/api/public/oauth/revoke")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const body = await parseBody(request);
        const token = (body.token ?? "").trim();
        // Per RFC 7009 we always return 200 even on unknown tokens.
        if (token) {
          await supabaseAdmin.rpc("mcp_oauth_revoke_token", { _token_hash: sha256(token) } as never);
        }
        return jsonResponse({ ok: true });
      },
    },
  },
});
