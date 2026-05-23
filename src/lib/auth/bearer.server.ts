import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { sha256 } from "@/lib/oauth/mcp-oauth.server";
import { hashToken } from "@/lib/account/tokens.server";

const supabaseAdmin = _supabaseAdmin as any;

export type BearerAuth = { user_id: string; source: "oauth" | "pat" };

/** OAuth access token first, then legacy personal MCP token (`sas_...`). */
export async function verifyBearer(token: string): Promise<BearerAuth | null> {
  const { data: oauth } = await supabaseAdmin.rpc("mcp_oauth_verify_access", {
    _token_hash: sha256(token),
  } as never);
  const oauthRow = oauth as { user_id?: string } | null;
  if (oauthRow?.user_id) return { user_id: oauthRow.user_id, source: "oauth" };

  if (
    token.startsWith("sas_") &&
    !token.startsWith("sas_at_") &&
    !token.startsWith("sas_rt_") &&
    !token.startsWith("sas_code_")
  ) {
    const { data } = await supabaseAdmin
      .from("mcp_tokens")
      .select("user_id,id")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (data?.user_id) {
      await supabaseAdmin
        .from("mcp_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);
      return { user_id: data.user_id, source: "pat" };
    }
  }
  return null;
}

/** Extract a Bearer token from an `Authorization` header (empty string if absent). */
export function extractBearer(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}
