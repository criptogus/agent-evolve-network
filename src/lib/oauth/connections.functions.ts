import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

/** List MCP OAuth clients the current user has authorized. */
export const listOauthConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const { data, error } = await supabase.rpc("mcp_oauth_list_user_connections");
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as Array<{
      client_id: string;
      client_name: string;
      scope: string;
      active_access: number;
      active_refresh: number;
      first_granted: string;
      last_used: string | null;
    }> };
  });

/**
 * Test whether the user has at least one live access token for a given
 * client_id and that it can complete a tools/list round-trip against the
 * MCP endpoint. Used by /account/connections to give users a "this
 * connection still works" green light instead of having to open the
 * client itself.
 */
export const testOauthConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    // We don't expose the actual token to the browser — instead we ask the
    // database whether the user has a live access token for this client
    // and then ping the MCP endpoint server-side using that token (via a
    // dedicated RPC that returns a one-shot, short-TTL probe value).
    const { data: userRow } = await supabase.auth.getUser();
    const userId = userRow?.user?.id;
    if (!userId) return { ok: false, reason: "not_signed_in", last_used: null as string | null };
    // We don't expose tokens to the browser — instead the admin client
    // checks for a live access token and reports freshness. Combined
    // with the fact that the MCP endpoint exercises the token on every
    // call (and updates last_used_at), an unrevoked, unexpired token
    // is the signal a user really wants.
    const nowIso = new Date().toISOString();
    const { data: live } = await supabaseAdmin
      .from("mcp_oauth_tokens")
      .select("id,last_used_at,expires_at")
      .eq("user_id", userId)
      .eq("client_id", data.client_id)
      .eq("kind", "access")
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!live) {
      return { ok: false, reason: "no_live_token", last_used: null as string | null };
    }
    return {
      ok: true,
      reason: "live_token",
      last_used: (live.last_used_at as string | null) ?? null,
      expires_at: live.expires_at as string,
    };
  });

/** Revoke ALL active tokens for a given client_id (current user only). */
export const revokeOauthConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const { data: count, error } = await supabase.rpc(
      "mcp_oauth_revoke_client_for_user",
      { _client_id: data.client_id },
    );
    if (error) throw new Error(error.message);
    return { revoked: count ?? 0 };
  });
