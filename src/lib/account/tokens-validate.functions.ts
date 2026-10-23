import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { hashToken } from "./tokens.server";

export const validateMcpToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const token = data.token.trim();
    if (!token.startsWith("sas_")) {
      return { ok: false as const, reason: "Token must start with 'sas_'." };
    }
    const { data: row, error } = await supabaseAdmin
      .from("mcp_tokens")
      .select("id, name, prefix, user_id, last_used_at, created_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (error) {
      return { ok: false as const, reason: `Lookup failed: ${error.message}` };
    }
    if (!row) {
      return { ok: false as const, reason: "Token not recognized or revoked." };
    }
    // touch last_used_at (non-blocking, ignore failures)
    await supabaseAdmin
      .from("mcp_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id);
    return {
      ok: true as const,
      name: row.name,
      prefix: row.prefix,
      created_at: row.created_at,
    };
  });
