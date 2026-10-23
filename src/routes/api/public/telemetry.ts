import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { ExecutionEventSchema, ingestExecution } from "@/lib/trust/telemetry";
import { createHash } from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// POST /api/public/telemetry
// Public, anonymous CLI/agent execution telemetry. Two side effects:
//  1. Insert raw row into skill_executions (workspace anonymized).
//  2. Best-effort call to report_skill_execution RPC so the trust score,
//     model heatmap and battle-tested badge update without a separate write
//     tool / OAuth bearer. Rate-limited per agent_fp by the RPC itself.
export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid json" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const parsed = ExecutionEventSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.issues }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const event = parsed.data;
        const extra = (typeof body === "object" && body) as Record<string, unknown> | null;
        const model = typeof extra?.model === "string" ? (extra.model as string) : undefined;

        try {
          const row = await ingestExecution(
            event,
            supabaseAdmin.from("skill_executions") as any,
          );
          // Stable per-workspace fingerprint for trust RPC rate limiting.
          const agentFp =
            row.workspace_hash ??
            createHash("sha256")
              .update(`${event.runtime ?? "cli"}:${event.workspace_id ?? "anon"}`)
              .digest("hex")
              .slice(0, 32);
          // Best-effort: never fail the request if the RPC is missing/limited.
          await supabaseAdmin
            .rpc("report_skill_execution", {
              _slug: event.package_slug,
              _success: event.success,
              _model: model,
              _version: event.package_version,
              _latency_ms: event.latency_ms,
              _tokens_in: null,
              _tokens_out: null,
              _error_kind: event.error_class ?? null,
              _agent_fp: agentFp,
              _arm: event.arm ?? null,
              _experiment_key: event.experiment_key ?? null,
              _task_completed: event.task_completed ?? null,
              _human_intervention: event.human_intervention ?? null,
              _user_rating: event.user_rating ?? null,
              _baseline_latency_ms: event.baseline_latency_ms ?? null,
              _baseline_tokens: event.baseline_tokens ?? null,
              _workspace_hash: row.workspace_hash,
            } as any)

            .then(() => {})
            .catch(() => {});
          return new Response(
            JSON.stringify({ ok: true, anonymized_workspace: row.workspace_hash }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        } catch (e) {
          console.error("[api/public/telemetry] error:", e);
          return new Response(JSON.stringify({ error: "internal_server_error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
