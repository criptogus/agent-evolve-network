import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { sha256 } from "@/lib/oauth/mcp-oauth.server";
import { hashToken } from "@/lib/account/tokens.server";

const supabaseAdmin = _supabaseAdmin as any;

export type BearerAuth = { user_id: string; source: "oauth" | "pat" };

/**
 * Why a bearer was not honoured. Surfaced via the X-MCP-Auth header and the
 * JSON-RPC error data so a client can self-diagnose without server logs.
 *  - oauth-rejected   : looked like an OAuth access token but did not verify
 *                       (revoked / expired / never issued / different env)
 *  - pat-rejected     : looked like a personal access token but hash mismatch
 *  - refresh-or-code  : caller mistakenly sent a refresh token / auth code
 *                       instead of an access token
 *  - unsupported      : non-empty bearer that we don't recognise
 */
export type BearerRejection =
  | "oauth-rejected"
  | "pat-rejected"
  | "refresh-or-code"
  | "unsupported";

export type BearerResult =
  | { ok: true; auth: BearerAuth }
  | { ok: false; reason: BearerRejection };

/** OAuth access token first, then legacy personal MCP token (`sas_...`). */
export async function verifyBearerDetailed(token: string): Promise<BearerResult> {
  // Caller sent a refresh token or auth code as if it were a bearer — common
  // mistake when copy-pasting from the OAuth callback URL.
  if (token.startsWith("sas_rt_") || token.startsWith("sas_code_")) {
    return { ok: false, reason: "refresh-or-code" };
  }

  // OAuth-shaped access tokens (`sas_at_…`) ONLY verify via the OAuth table.
  // Also try sha256 path for any bearer — opaque tokens issued before the
  // `sas_at_` prefix existed live there too.
  const { data: oauth } = await supabaseAdmin.rpc("mcp_oauth_verify_access", {
    _token_hash: sha256(token),
  } as never);
  const oauthRow = oauth as { user_id?: string } | null;
  if (oauthRow?.user_id) return { ok: true, auth: { user_id: oauthRow.user_id, source: "oauth" } };
  if (token.startsWith("sas_at_")) {
    // Looked like an OAuth access token but did not verify — explicit signal
    // so the host can trigger the OAuth refresh / re-authorize flow.
    return { ok: false, reason: "oauth-rejected" };
  }

  // Personal access tokens: `sas_…` but NOT one of the OAuth artefacts above.
  if (token.startsWith("sas_")) {
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
      return { ok: true, auth: { user_id: data.user_id, source: "pat" } };
    }
    return { ok: false, reason: "pat-rejected" };
  }

  return { ok: false, reason: "unsupported" };
}

/** Back-compat wrapper for callers that only need the success case. */
export async function verifyBearer(token: string): Promise<BearerAuth | null> {
  const r = await verifyBearerDetailed(token);
  return r.ok ? r.auth : null;
}

/** Extract a Bearer token from an `Authorization` header (empty string if absent). */
export function extractBearer(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}
