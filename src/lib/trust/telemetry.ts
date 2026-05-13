import { createHash } from "node:crypto";
import { z } from "zod";

export const ExecutionEventSchema = z.object({
  package_slug: z.string().min(1).max(128),
  package_version: z.string().max(32).optional(),
  workspace_id: z.string().max(128).optional(),
  runtime: z.string().max(64).optional(),
  latency_ms: z.number().int().nonnegative().max(600_000).optional(),
  success: z.boolean(),
  error_class: z.string().max(64).nullish(),
  guardrail_triggered: z.array(z.string().max(64)).max(20).default([]),
});

export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

const TELEMETRY_SALT = process.env.TELEMETRY_SALT ?? "super-agent-skill-telemetry";

export function anonymizeWorkspace(workspaceId?: string): string | null {
  if (!workspaceId) return null;
  return createHash("sha256").update(`${TELEMETRY_SALT}:${workspaceId}`).digest("hex").slice(0, 32);
}

export interface TelemetrySink {
  insert(rows: Array<Record<string, unknown>>): Promise<{ error?: { message: string } | null }>;
}

export async function ingestExecution(event: ExecutionEvent, sink: TelemetrySink) {
  const row = {
    package_slug: event.package_slug,
    package_version: event.package_version ?? null,
    workspace_hash: anonymizeWorkspace(event.workspace_id),
    runtime: event.runtime ?? null,
    latency_ms: event.latency_ms ?? null,
    success: event.success,
    error_class: event.error_class ?? null,
    guardrail_triggered: event.guardrail_triggered,
  };
  const { error } = await sink.insert([row]);
  if (error) throw new Error(`telemetry ingest failed: ${error.message}`);
  return row;
}
