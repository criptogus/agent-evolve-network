/**
 * Connection + activity status for the signed-in user. Powers the Nav
 * "Connected" state and the /home command center so the UI can stop asking
 * people to connect once they already did.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConnectionStatus = {
  connected: boolean;
  tokenCount: number;
  oauthClientCount: number;
  clientNames: string[];
  lastUsedAt: string | null;
  installCount: number;
};

export const getConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConnectionStatus> => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;

    const empty: ConnectionStatus = {
      connected: false,
      tokenCount: 0,
      oauthClientCount: 0,
      clientNames: [],
      lastUsedAt: null,
      installCount: 0,
    };

    try {
      const [tokensRes, oauthRes, installsRes] = await Promise.all([
        supabase
          .from("mcp_tokens")
          .select("id,name,last_used_at")
          .eq("user_id", userId),
        supabase.rpc("mcp_oauth_list_user_connections"),
        supabase
          .from("package_installs")
          .select("package_id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      const tokens = (tokensRes?.data ?? []) as Array<{
        name: string | null;
        last_used_at: string | null;
      }>;
      const oauth = (oauthRes?.data ?? []) as Array<{
        client_name: string | null;
        last_used: string | null;
      }>;

      const stamps = [
        ...tokens.map((t) => t.last_used_at),
        ...oauth.map((o) => o.last_used),
      ].filter((s): s is string => !!s);
      const lastUsedAt = stamps.length
        ? stamps.sort((a, b) => (a < b ? 1 : -1))[0]!
        : null;

      const clientNames = Array.from(
        new Set([
          ...oauth.map((o) => o.client_name).filter((n): n is string => !!n),
          ...tokens.map((t) => t.name).filter((n): n is string => !!n),
        ]),
      ).slice(0, 4);

      return {
        connected: tokens.length > 0 || oauth.length > 0,
        tokenCount: tokens.length,
        oauthClientCount: oauth.length,
        clientNames,
        lastUsedAt,
        installCount: installsRes?.count ?? 0,
      };
    } catch {
      return empty;
    }
  });
