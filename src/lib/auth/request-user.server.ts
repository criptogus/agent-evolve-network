import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyBearer } from "@/lib/auth/bearer.server";
/** Authentication is optional only for anonymous capability exams, never for owned history. */
export async function getVerifiedRequestUserId(request: Request): Promise<string | null> {
  const value = request.headers.get("authorization");
  if (!value) return null;
  const token = value.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && data.user) return data.user.id;
  const bearer = await verifyBearer(token);
  if (bearer) return bearer.user_id;
  throw new Response("Unauthorized", { status: 401 });
}
