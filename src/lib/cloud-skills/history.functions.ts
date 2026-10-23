import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePaidSubscription } from "./subscription-guard";
import { PROVIDER_IDS } from "./providers";

const SELECT =
  "id, source, provider, provider_label, scope, strategy, status, client_name, skill_count, written_count, skipped_count, conflict_count, unresolved_count, orphan_count, bytes, error, created_at";

/** Paginated sync/export history for the signed-in user, newest first. */
export const listSyncEvents = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z
      .object({
        provider: z.string().refine((v) => PROVIDER_IDS.includes(v)).optional(),
        scope: z.enum(["project", "global"]).optional(),
        status: z.enum(["ok", "partial", "pending_conflicts", "no_changes", "error"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    let q = supabase
      .from("cloud_skill_sync_events")
      .select(SELECT, { count: "exact" })
      .eq("user_id", userId);
    if (data.provider) q = q.eq("provider", data.provider);
    if (data.scope) q = q.eq("scope", data.scope);
    if (data.status) q = q.eq("status", data.status);

    const { data: rows, error, count } = await q
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Response(error.message, { status: 500 });

    return { events: rows ?? [], total: count ?? 0 };
  });

/** Per-provider/scope rollup so the user sees where their library actually lives. */
export const syncHistorySummary = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .handler(async ({ context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: rows, error } = await supabase
      .from("cloud_skill_sync_events")
      .select("provider, provider_label, scope, status, written_count, conflict_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Response(error.message, { status: 500 });

    const byKey = new Map<string, any>();
    for (const r of rows ?? []) {
      const key = `${r.provider}:${r.scope}`;
      const cur = byKey.get(key);
      if (!cur) {
        byKey.set(key, {
          provider: r.provider,
          provider_label: r.provider_label ?? r.provider,
          scope: r.scope,
          syncs: 1,
          files_written: r.written_count ?? 0,
          conflicts: r.conflict_count ?? 0,
          last_status: r.status,
          last_synced_at: r.created_at,
        });
      } else {
        cur.syncs += 1;
        cur.files_written += r.written_count ?? 0;
        cur.conflicts += r.conflict_count ?? 0;
      }
    }

    return {
      targets: [...byKey.values()].sort(
        (a, b) => +new Date(b.last_synced_at) - +new Date(a.last_synced_at),
      ),
      total_events: rows?.length ?? 0,
    };
  });

/** Full audit detail of a single event, including per-file diffs applied. */
export const getSyncEvent = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: event, error } = await supabase
      .from("cloud_skill_sync_events")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!event) throw new Response("Not found", { status: 404 });

    return { event };
  });
