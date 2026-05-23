import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hashToken, newToken } from "./tokens.server";

export const listMcpTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { data } = await supabase
      .from("mcp_tokens")
      .select("id,name,prefix,last_used_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { items: data ?? [] };
  });

export const createMcpToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        // Trim and require a real name — empty / whitespace-only strings used to
        // silently default to "Default" in the UI, which left users unable to
        // tell their tokens apart in the revoke list. Force a deliberate label.
        name: z
          .string()
          .transform((s) => s.trim())
          .pipe(z.string().min(1, "name is required").max(80)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
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
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { error } = await supabase.from("mcp_tokens").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
