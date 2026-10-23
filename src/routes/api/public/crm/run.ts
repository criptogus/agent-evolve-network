import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly CRM cadence runner, called by pg_cron with the project apikey.
 * Evaluates every customer, sends at most one lifecycle email each, and
 * respects the global cadence caps (2 emails / 7 days, 48h apart).
 */
function authorized(request: Request): boolean {
  const expected = [
    process.env["SUPABASE_PUBLISHABLE_KEY"],
    process.env["SUPABASE_ANON_KEY"],
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    process.env["SUPABASE_SERVICE_ROLE_KEY"],
  ].filter(Boolean) as string[];
  const url = new URL(request.url);
  const provided =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("apikey") ??
    "";
  return !!provided && expected.includes(provided);
}

export const Route = createFileRoute("/api/public/crm/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request))
          return Response.json({ error: "Unauthorized" }, { status: 401 });

        let dryRun = false;
        let maxSends = 200;
        try {
          const body = (await request.json()) as { dry_run?: boolean; max_sends?: number };
          dryRun = !!body?.dry_run;
          if (typeof body?.max_sends === "number") maxSends = Math.min(500, Math.max(1, body.max_sends));
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
            { ok: false, error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
