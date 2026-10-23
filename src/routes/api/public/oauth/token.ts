import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  corsPreflight,
  generateAccessToken,
  generateRefreshToken,
  jsonResponse,
  oauthError,
  sha256,
  verifyPkceS256,
} from "@/lib/oauth/mcp-oauth.server";

const CodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(8).max(400),
  redirect_uri: z.string().min(3).max(2000),
  client_id: z.string().min(3).max(200),
  code_verifier: z.string().min(43).max(128),
});

const RefreshSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(8).max(400),
  client_id: z.string().min(3).max(200),
  scope: z.string().optional(),
});

async function parseBody(request: Request): Promise<Record<string, string> | null> {
  const ct = request.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      return (await request.json()) as Record<string, string>;
    }
    const fd = await request.formData();
    const obj: Record<string, string> = {};
    fd.forEach((v, k) => {
      obj[k] = typeof v === "string" ? v : "";
    });
    return obj;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/oauth/token")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const body = await parseBody(request);
        if (!body) return oauthError("invalid_request", "Unable to parse body");

        if (body.grant_type === "authorization_code") {
          const parsed = CodeExchangeSchema.safeParse(body);
          if (!parsed.success) {
            return oauthError("invalid_request", parsed.error.issues.map((i) => i.message).join("; "));
          }
          const code_hash = sha256(parsed.data.code);

          // Look up the auth code, verify PKCE before committing the exchange.
          const { data: row, error: lookupErr } = await supabaseAdmin
            .from("mcp_oauth_authorizations")
            .select("client_id,redirect_uri,code_challenge,code_challenge_method,used_at,expires_at")
            .eq("code_hash", code_hash)
            .maybeSingle();
          if (lookupErr) return oauthError("server_error", lookupErr.message, 500);
          if (!row) return oauthError("invalid_grant", "Unknown or used code");
          if (row.used_at) return oauthError("invalid_grant", "Code already exchanged");
          if (new Date(row.expires_at).getTime() <= Date.now()) {
            return oauthError("invalid_grant", "Code expired");
          }
          if (row.client_id !== parsed.data.client_id) {
            return oauthError("invalid_grant", "client_id mismatch");
          }
          if (row.redirect_uri !== parsed.data.redirect_uri) {
            return oauthError("invalid_grant", "redirect_uri mismatch");
          }
          if (row.code_challenge_method !== "S256") {
            return oauthError("invalid_grant", "Only S256 supported");
          }
          if (!verifyPkceS256(parsed.data.code_verifier, row.code_challenge)) {
            return oauthError("invalid_grant", "PKCE verifier mismatch");
          }

          const access = generateAccessToken();
          const refresh = generateRefreshToken();
          const { data: tx, error: exchErr } = await supabaseAdmin.rpc("mcp_oauth_exchange_code", {
            _client_id: parsed.data.client_id,
            _redirect_uri: parsed.data.redirect_uri,
            _code_hash: code_hash,
            _access_token_hash: sha256(access),
            _refresh_token_hash: sha256(refresh),
            _access_ttl_seconds: ACCESS_TTL_SECONDS,
            _refresh_ttl_seconds: REFRESH_TTL_SECONDS,
          } as never);
          if (exchErr) return oauthError("invalid_grant", exchErr.message);

          return jsonResponse({
            access_token: access,
            token_type: "Bearer",
            expires_in: ACCESS_TTL_SECONDS,
            refresh_token: refresh,
            scope: (tx as { scope?: string })?.scope ?? "mcp:read mcp:write",
          });
        }

        if (body.grant_type === "refresh_token") {
          const parsed = RefreshSchema.safeParse(body);
          if (!parsed.success) {
            return oauthError("invalid_request", parsed.error.issues.map((i) => i.message).join("; "));
          }
          const newAccess = generateAccessToken();
          const newRefresh = generateRefreshToken();
          const { data: tx, error } = await supabaseAdmin.rpc("mcp_oauth_refresh_token", {
            _client_id: parsed.data.client_id,
            _old_refresh_hash: sha256(parsed.data.refresh_token),
            _new_access_hash: sha256(newAccess),
            _new_refresh_hash: sha256(newRefresh),
            _access_ttl_seconds: ACCESS_TTL_SECONDS,
            _refresh_ttl_seconds: REFRESH_TTL_SECONDS,
          } as never);
          if (error) return oauthError("invalid_grant", error.message);
          return jsonResponse({
            access_token: newAccess,
            token_type: "Bearer",
            expires_in: ACCESS_TTL_SECONDS,
            refresh_token: newRefresh,
            scope: (tx as { scope?: string })?.scope ?? "mcp:read mcp:write",
          });
        }

        return oauthError("unsupported_grant_type");
      },
    },
  },
});
