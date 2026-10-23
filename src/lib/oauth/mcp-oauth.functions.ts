import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import {
  CODE_TTL_SECONDS,
  generateAuthCode,
  sha256,
} from "@/lib/oauth/mcp-oauth.server";

/** Fetch the public client metadata for the consent screen. */
export const getOauthClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ client_id: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin.rpc("mcp_oauth_get_client", {
      _client_id: data.client_id,
    } as never);
    if (error) throw new Error(error.message);
    if (!row) throw new Error("unknown_client");
    return row as {
      client_id: string;
      client_name: string;
      client_uri?: string | null;
      logo_uri?: string | null;
      redirect_uris: string[];
      scope: string;
    };
  });

/** Called by the consent screen after the user clicks "Authorize". */
export const issueOauthCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        client_id: z.string().min(3).max(200),
        redirect_uri: z.string().min(3).max(2000),
        scope: z.string().max(500).optional(),
        state: z.string().max(500).optional(),
        code_challenge: z.string().min(32).max(200),
        code_challenge_method: z.literal("S256"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const code = generateAuthCode();
    const { error } = await supabase.rpc("mcp_oauth_issue_code", {
      _client_id: data.client_id,
      _redirect_uri: data.redirect_uri,
      _scope: data.scope ?? "mcp:read mcp:write",
      _code_challenge: data.code_challenge,
      _code_challenge_method: data.code_challenge_method,
      _code_hash: sha256(code),
      _ttl_seconds: CODE_TTL_SECONDS,
    } as never);
    if (error) throw new Error(error.message);

    const sep = data.redirect_uri.includes("?") ? "&" : "?";
    const stateQ = data.state ? `&state=${encodeURIComponent(data.state)}` : "";
    // We also return the raw `code` so the success page can show it as a
    // manual paste fallback when the client's loopback listener is no
    // longer up (or for clients that use private-use URI schemes that
    // never actually surface back to the browser tab).
    return {
      redirect_to: `${data.redirect_uri}${sep}code=${encodeURIComponent(code)}${stateQ}`,
      code,
    };
  });
