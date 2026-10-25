import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyBearer } from "@/lib/auth/bearer.server";
export async function searchIdentity(token: string): Promise<string | null> {
  if (!token) return null;
  if (token.startsWith("eyJ")) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return !error && data.user ? data.user.id : null;
  }
  return (await verifyBearer(token))?.user_id ?? null;
}
