import type { AppDatabaseClient } from "@/integrations/supabase/database";
import type { TelemetrySink } from "./telemetry";
import { createHash } from "node:crypto";
/** One authoritative write through the rate-limited RPC; it resolves package_id. */
export function telemetrySink(client: AppDatabaseClient, model?: string): TelemetrySink {
  return {
    async insert(rows) {
      for (const row of rows) {
        const agentFp =
          row.workspace_hash ??
          createHash("sha256")
            .update(`${row.runtime ?? "cli"}:anon`)
            .digest("hex")
            .slice(0, 32);
        const { error } = await client.rpc("report_skill_execution", {
          _slug: row.package_slug,
          _success: row.success,
          _model: model,
          _version: row.package_version ?? undefined,
          _latency_ms: row.latency_ms ?? undefined,
          _error_kind: row.error_class ?? undefined,
          _agent_fp: agentFp,
          _arm: row.arm ?? undefined,
          _experiment_key: row.experiment_key ?? undefined,
          _task_completed: row.task_completed ?? undefined,
          _human_intervention: row.human_intervention ?? undefined,
          _user_rating: row.user_rating ?? undefined,
          _baseline_latency_ms: row.baseline_latency_ms ?? undefined,
          _baseline_tokens: row.baseline_tokens ?? undefined,
          _workspace_hash: row.workspace_hash ?? undefined,
        });
        if (error) return { error };
      }
      return { error: null };
    },
  };
}
