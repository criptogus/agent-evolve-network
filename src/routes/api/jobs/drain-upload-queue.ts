import { createFileRoute } from "@tanstack/react-router";
import { drainUploadQueue } from "@/lib/uploads/queue.server";

// Cron-callable drain endpoint. Drains up to N queued upload jobs per
// invocation. Vercel's cron infrastructure hits this once a minute (see
// vercel.json). Also callable manually with the CRON_SECRET for debugging.
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` if the
// env var is set. We accept either that, or a `?secret=` query string
// matching the same value — handy for hitting the URL from a browser.
//
// The endpoint never throws — it returns a JSON summary so cron logs are
// readable and a single bad job doesn't poison the schedule.

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const url = new URL(req.url);
    const provided =
      (auth.startsWith("Bearer ") ? auth.slice(7).trim() : "") ||
      url.searchParams.get("secret") ||
      "";
    if (provided !== secret) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  try {
    const url = new URL(req.url);
    const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? 3) || 3));
    const result = await drainUploadQueue(limit);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[drain-upload-queue] fatal:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/jobs/drain-upload-queue")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
