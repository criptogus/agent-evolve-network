import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Signed-in user id for a public server function, or null when the caller is
 * anonymous or the bearer token does not verify. Never throws.
 */
export async function getOptionalUserId(): Promise<string | null> {
  try {
    const header = getRequest()?.headers.get("authorization") ?? "";
    if (!header.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token) return null;
    const { data, error } = await supabaseAdmin.auth.getClaims(token);
    const sub = data?.claims?.sub;
    return !error && typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

/** Server-side admin check for an already-verified user id. */
export async function isAdminUser(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
