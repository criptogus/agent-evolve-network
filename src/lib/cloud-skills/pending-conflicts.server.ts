/**
 * Persistence for the pending-conflict queue. Server-only: uses the admin
 * client because MCP syncs run as the OAuth-verified user, not as a session.
 */
import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";
import type { ProviderScope } from "./providers";

const admin = _admin as any;
const TABLE = "cloud_skill_sync_conflicts";

export type RecordedConflict = {
  slug: string;
  path: string;
  kind: string;
  detail?: string | null;
  local_lines?: number | null;
  cloud_lines?: number | null;
  local_only_lines?: number | null
  local_content?: string | null;
  cloud_hash?: string | null;
  cloud_version?: number | null;
};

/**
 * Upserts one row per (user, tool, scope, slug) so re-running a sync refreshes
 * the queue instead of duplicating it. Never throws: a bookkeeping failure must
 * not break the sync the agent is performing.
 */
export async function recordPendingConflicts(args: {
  userId: string;
  provider: string;
  providerLabel?: string | null;
  scope: ProviderScope;
  clientName?: string | null;
  conflicts: RecordedConflict[];
}): Promise<number> {
  if (!args.conflicts.length) return 0;
  const now = new Date().toISOString();
  const rows = args.conflicts.slice(0, 500).map((c) => ({
    user_id: args.userId,
    provider: args.provider,
    provider_label: args.providerLabel ?? null,
    scope: args.scope,
    slug: c.slug,
    path: c.path,
    kind: c.kind ?? "diverged",
    detail: c.detail ?? null,
    local_lines: c.local_lines ?? null,
    cloud_lines: c.cloud_lines ?? null,
    local_only_lines: c.local_only_lines ?? null,
    local_content: c.local_content ? c.local_content.slice(0, 200_000) : null,
    cloud_hash: c.cloud_hash ?? null,
    cloud_version: c.cloud_version ?? null,
    client_name: args.clientName ?? null,
    decision: null,
    decided_at: null,
    status: "pending",
    updated_at: now,
  }));

  try {
    const { error } = await admin
      .from(TABLE)
      .upsert(rows, { onConflict: "user_id,provider,scope,slug" });
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}

/** Drops queue entries for files that no longer conflict. */
export async function clearResolvedConflicts(args: {
  userId: string;
  provider: string;
  scope: ProviderScope;
  slugs: string[];
}): Promise<void> {
  if (!args.slugs.length) return;
  try {
    await admin
      .from(TABLE)
      .delete()
      .eq("user_id", args.userId)
      .eq("provider", args.provider)
      .eq("scope", args.scope)
      .in("slug", args.slugs.slice(0, 500));
  } catch {
    /* bookkeeping only */
  }
}

/** Open queue for one user, used by the MCP tool that reports pending work. */
export async function openConflictsForUser(userId: string) {
  const { data, error } = await admin
    .from(TABLE)
    .select("provider, provider_label, scope, slug, path, kind, detail, local_only_lines, decision, status, updated_at")
    .eq("user_id", userId)
    .in("status", ["pending", "decided"])
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as any[];
}
