/**
 * Idempotency helpers for MCP write tools (upload_packages, request_primitive).
 *
 * Agents retry on network blips. Without idempotency, a retried
 * upload_packages creates duplicate drafts and burns the write quota.
 * Callers may pass `idempotency_key` (any opaque string they generate
 * once per logical operation); the server hashes it, scopes it to the
 * user + tool, caches the response for 24h, and returns the cached
 * result on subsequent retries with the same key.
 *
 * Implementation lives in two RPCs (mcp_idempotency_get /
 * mcp_idempotency_put) so the contention is in the database and the
 * tool execute() handlers stay small.
 */
import { createHash } from "crypto";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function getIdempotent(
  userId: string,
  tool: string,
  key: string | undefined | null,
): Promise<unknown | null> {
  if (!key) return null;
  try {
    const { data } = await supabaseAdmin.rpc("mcp_idempotency_get", {
      _user_id: userId,
      _key_hash: hashKey(key),
      _tool: tool,
    } as never);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function putIdempotent(
  userId: string,
  tool: string,
  key: string | undefined | null,
  response: unknown,
): Promise<void> {
  if (!key) return;
  try {
    await supabaseAdmin.rpc("mcp_idempotency_put", {
      _user_id: userId,
      _key_hash: hashKey(key),
      _tool: tool,
      _response: response as never,
    } as never);
  } catch {
    /* never fail the user's call on idempotency persistence */
  }
}
