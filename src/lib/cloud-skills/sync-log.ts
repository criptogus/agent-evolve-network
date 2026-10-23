/**
 * Audit trail for cloud → local skill syncs and private zip exports.
 *
 * Pure shaping only (no I/O): the MCP tools, the export server fn and the
 * account UI all read/write the same event shape, so what the agent did and
 * what the history page shows can never disagree.
 */

export type SyncSource = "mcp_sync" | "mcp_sync_all" | "zip_export";

export type SyncStatus = "ok" | "partial" | "pending_conflicts" | "no_changes" | "error";

export type SyncChange = {
  slug: string;
  path: string;
  /** write | overwrite | merge | keep_both | skip, as resolved by conflicts.ts */
  action: string;
  version?: number | null;
  note?: string | null;
  /** true when the local file diverged from the cloud version. */
  conflict?: boolean;
};

export type SyncEventInput = {
  source: SyncSource;
  provider: string;
  provider_label?: string | null;
  scope: "project" | "global";
  strategy?: string | null;
  client_name?: string | null;
  skill_count: number;
  changes: SyncChange[];
  conflicts?: unknown[];
  orphans?: string[];
  bytes?: number | null;
  error?: string | null;
};

export const SYNC_SOURCE_LABELS: Record<SyncSource, string> = {
  mcp_sync: "MCP sync",
  mcp_sync_all: "MCP sync (multi-tool)",
  zip_export: "Private .zip export",
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  ok: "Applied",
  partial: "Applied with conflicts",
  pending_conflicts: "Waiting on your decision",
  no_changes: "Already up to date",
  error: "Failed",
};

/** Derives the audit status from what actually happened. */
export function syncStatus(input: {
  written: number;
  unresolved: number;
  conflicts: number;
  error?: string | null;
}): SyncStatus {
  if (input.error) return "error";
  if (input.unresolved > 0) return input.written > 0 ? "partial" : "pending_conflicts";
  if (input.written === 0) return "no_changes";
  return "ok";
}

/** Row payload for `cloud_skill_sync_events`, derived from one event input. */
export function toSyncEventRow(userId: string, e: SyncEventInput) {
  const written = e.changes.filter((c) => c.action !== "skip").length;
  const skipped = e.changes.length - written;
  const conflictChanges = e.changes.filter((c) => c.conflict);
  const unresolved = conflictChanges.filter((c) => c.action === "skip").length;

  return {
    user_id: userId,
    source: e.source,
    provider: e.provider,
    provider_label: e.provider_label ?? null,
    scope: e.scope,
    strategy: e.strategy ?? null,
    client_name: e.client_name ?? null,
    status: syncStatus({ written, unresolved, conflicts: conflictChanges.length, error: e.error }),
    skill_count: e.skill_count,
    written_count: written,
    skipped_count: skipped,
    conflict_count: conflictChanges.length,
    unresolved_count: unresolved,
    orphan_count: e.orphans?.length ?? 0,
    bytes: e.bytes ?? null,
    error: e.error ?? null,
    // Cap the detail payload so a 500-skill sync can't blow up a row.
    changes: e.changes.slice(0, 300),
    conflicts: (e.conflicts ?? []).slice(0, 100),
    orphans: (e.orphans ?? []).slice(0, 100),
  };
}

/** One-line human summary used in the history list and in MCP responses. */
export function summarizeSyncEvent(row: {
  status: string;
  written_count: number;
  skipped_count: number;
  conflict_count: number;
  unresolved_count: number;
  provider_label?: string | null;
  provider: string;
  scope: string;
}): string {
  const tool = row.provider_label ?? row.provider;
  const parts = [`${row.written_count} written`];
  if (row.skipped_count) parts.push(`${row.skipped_count} skipped`);
  if (row.conflict_count) parts.push(`${row.conflict_count} conflict${row.conflict_count === 1 ? "" : "s"}`);
  if (row.unresolved_count) parts.push(`${row.unresolved_count} unresolved`);
  return `${tool} (${row.scope}): ${parts.join(", ")}`;
}
