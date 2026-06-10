import { createFileRoute } from "@tanstack/react-router";
import { certifyContent } from "@/lib/certify/certify.server";
import { badgeUrl, embedMarkdown, parseCertifyRequest, verifyUrl } from "@/lib/certify/core";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Best-effort per-isolate limiter. A warm Workers isolate serves many requests,
// so this blunts abuse loops without a shared store; real quota enforcement can
// move to a durable counter when the endpoint gets traction.
const RATE = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = RATE.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    RATE.set(ip, { count: 1, windowStart: now });
    if (RATE.size > 5000) RATE.clear();
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

// POST /api/public/certify
//   { name, type, content } → runs the same proprietary engine as the
//   `review_skill` MCP tool, stores the result keyed by content SHA-256, and
//   returns a permanent badge + verification URL. Works for ANY skill file —
//   the author doesn't need to host it on the registry.
export const Route = createFileRoute("/api/public/certify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for") ??
          "unknown";
        if (rateLimited(ip)) {
          return json(
            { error: "rate_limited", detail: `max ${RATE_LIMIT} certifications per hour` },
            429,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        const parsed = parseCertifyRequest(body);
        if (!parsed.ok) return json({ error: "invalid_request", detail: parsed.error }, 400);

        try {
          const { record, report } = await certifyContent(parsed.value);
          const origin = new URL(request.url).origin;
          return json({
            id: record.id,
            name: record.name,
            type: record.type,
            content_sha256: record.content_sha256,
            overall_score: record.overall_score,
            grade: record.grade,
            engine_version: record.engine_version,
            created_at: record.created_at,
            badge_url: badgeUrl(origin, record.id),
            verify_url: verifyUrl(origin, record.id),
            embed_markdown: embedMarkdown(origin, record.id),
            report,
            note:
              "This is a content audit by the SuperAgentSkill review engine — the same scorer behind the review_skill MCP tool. " +
              "To verify a badge: fetch verify_url, sha256 the file you were given, and compare with content_sha256.",
          });
        } catch (e) {
          console.error("[api/public/certify] failed:", e);
          return json({ error: "internal_server_error" }, 500);
        }
      },
    },
  },
});
