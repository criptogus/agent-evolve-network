import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { ExecutionEventSchema, ingestExecution } from "@/lib/trust/telemetry";

export const Route = createFileRoute("/api/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "invalid json" }, { status: 400 }); }

        const parsed = ExecutionEventSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.issues }, { status: 400 });
        }

        try {
          const row = await ingestExecution(parsed.data, supabaseAdmin.from("skill_executions") as any);
          return Response.json({ ok: true, anonymized_workspace: row.workspace_hash });
        } catch (e) {
          console.error("[api/telemetry] error:", e);
          return Response.json({ error: "internal_server_error" }, { status: 500 });
        }
      },
    },
  },
});
