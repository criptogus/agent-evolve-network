import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** List MCP OAuth clients the current user has authorized. */
export const listOauthConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as { supabase: any };
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

/** Revoke ALL active tokens for a given client_id (current user only). */
export const revokeOauthConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: count, error } = await supabase.rpc(
      "mcp_oauth_revoke_client_for_user",
      { _client_id: data.client_id },
    );
    if (error) throw new Error(error.message);
    return { revoked: count ?? 0 };
  });
