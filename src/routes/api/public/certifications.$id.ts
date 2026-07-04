import { createFileRoute } from "@tanstack/react-router";
import { getCertification } from "@/lib/certify/certify.server";
import { badgeUrl, embedMarkdown } from "@/lib/certify/core";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/certifications/<id>
//   Public verification record for a certified skill: anyone holding the file
//   can sha256 it and compare with content_sha256 to confirm the badge refers
//   to exactly this content.
export const Route = createFileRoute("/api/public/certifications/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const record = await getCertification(params.id).catch(() => null);
        if (!record) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const origin = new URL(request.url).origin;
        return new Response(
          JSON.stringify({
            ...record,
            badge_url: badgeUrl(origin, record.id),
            embed_markdown: embedMarkdown(origin, record.id),
            how_to_verify:
              "sha256 the skill file you received and compare with content_sha256. A match proves this exact content earned this score on the issued date.",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "cache-control": "public, max-age=300, s-maxage=300",
              ...CORS,
            },
          },
        );
      },
    },
  },
});
