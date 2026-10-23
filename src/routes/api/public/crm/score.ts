import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly outcome scorer, called by pg_cron with the project apikey.
 * Decides, per sent message, whether the intended outcome happened inside the
 * trigger's attribution window, and closes the window when it expires.
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

export const Route = createFileRoute("/api/public/crm/score")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const { scoreOutcomes } = await import("@/lib/crm/learning.server");
          const result = await scoreOutcomes(500);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("CRM outcome scoring failed", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
