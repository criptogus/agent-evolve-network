import { toJson } from "@/lib/json";
import type { AppDatabaseClient } from "@/integrations/supabase/database";
import { toSyncEventRow, type SyncEventInput } from "./sync-log";

/**
 * Persists one audit entry. Never throws into the caller: an audit write must
 * not break a sync the user asked for.
 */
export async function recordSyncEvent(
  client: AppDatabaseClient,
  userId: string,
  event: SyncEventInput,
): Promise<void> {
  try {
    const row = toSyncEventRow(userId, event);
    const { error } = await client
      .from("cloud_skill_sync_events")
      .insert({ ...row, changes: toJson(row.changes), conflicts: toJson(row.conflicts) });
    if (error) console.error("[sync-log] insert failed", error.message);
  } catch (e) {
    console.error("[sync-log] insert threw", e);
  }
}
