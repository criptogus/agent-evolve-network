import { errorField } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly CRM cadence runner, called by the managed scheduler with the private cron secret.
 * Evaluates every customer, sends at most one lifecycle email each, and
 * respects the global cadence caps (2 emails / 7 days, 48h apart).
 */

export const Route = createFileRoute("/api/public/crm/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only the scheduler holds the private cron secret; the public site key is not accepted.
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        let dryRun = false;
        let maxSends = 200;
        try {
          const body = (await request.json()) as { dry_run?: boolean; max_sends?: number };
          dryRun = !!body?.dry_run;
          if (typeof body?.max_sends === "number")
            maxSends = Math.min(500, Math.max(1, body.max_sends));
        } catch {
          /* empty body is fine */
        }

        try {
          const { runCadence } = await import("@/lib/crm/mailer.server");
          const result = await runCadence({ dryRun, maxSends });
          return Response.json({ ok: true, ...result, details: undefined });
        } catch (err) {
          console.error("CRM cadence run failed", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? errorField(err, "message") : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
