import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly self-tuner, called by pg_cron with the project apikey.
 * Recomputes variant statistics, pauses statistically losing copy variants and
 * drafts replacements that wait for human approval.
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

export const Route = createFileRoute("/api/public/crm/tune")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
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
            { ok: false, error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
