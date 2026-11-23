import { errorField } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly self-tuner, called by the managed scheduler with the private cron secret.
 * Recomputes variant statistics, pauses statistically losing copy variants and
 * drafts replacements that wait for human approval.
 */

export const Route = createFileRoute("/api/public/crm/tune")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only the scheduler holds the private cron secret; the public site key is not accepted.
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        let dryRun = false;
        try {
          const body = (await request.json()) as { dry_run?: boolean };
          dryRun = !!body?.dry_run;
        } catch {
          /* empty body is fine */
        }
        try {
          const { runTuner } = await import("@/lib/crm/learning.server");
          const result = await runTuner({ dryRun });
          return Response.json({ ok: true, dry_run: dryRun, ...result });
        } catch (err) {
          console.error("CRM tuning failed", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? errorField(err, "message") : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
