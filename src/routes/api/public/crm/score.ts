import { errorField } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly outcome scorer, called by the managed scheduler with the private cron secret.
 * Decides, per sent message, whether the intended outcome happened inside the
 * trigger's attribution window, and closes the window when it expires.
 */

export const Route = createFileRoute("/api/public/crm/score")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only the scheduler holds the private cron secret; the public site key is not accepted.
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { scoreOutcomes } = await import("@/lib/crm/learning.server");
          const result = await scoreOutcomes(500);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("CRM outcome scoring failed", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? errorField(err, "message") : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
