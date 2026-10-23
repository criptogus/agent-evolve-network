import { telemetrySink } from "@/lib/trust/telemetry-sink.server";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin;
import { ExecutionEventSchema, ingestExecution } from "@/lib/trust/telemetry";

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
          const row = await ingestExecution(event, telemetrySink(supabaseAdmin, model));
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
