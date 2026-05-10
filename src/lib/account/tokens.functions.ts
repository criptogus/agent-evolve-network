import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): { token: string; prefix: string } {
  const raw = "sas_" + randomBytes(24).toString("base64url");
  return { token: raw, prefix: raw.slice(0, 10) };
}

export const listMcpTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("mcp_tokens")
      .select("id,name,prefix,last_used_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { items: data ?? [] };
  });

export const createMcpToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { token, prefix } = newToken();
    const { data: row, error } = await supabase
      .from("mcp_tokens")
      .insert({
        user_id: userId,
        name: data.name,
        prefix,
        token_hash: hashToken(token),
      })
      .select("id,name,prefix,created_at")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    // Plaintext returned ONCE — never stored anywhere except hashed.
    return { token, ...row };
  });

export const revokeMcpToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("mcp_tokens").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
