import { createFileRoute } from "@tanstack/react-router";
import { renderCertifiedBadge } from "@/lib/badges/trust-badge";
import { getCertification } from "@/lib/certify/certify.server";
import { badgeValue } from "@/lib/certify/core";

// GET /api/badges/certified/<id>.svg
//   → SVG "skill audit" badge for an external certification issued by
//     POST /api/public/certify. Embeddable in any README:
//     ![skill audit](https://superagentskill.com/api/badges/certified/<id>.svg)
//   Cached for 5 minutes at the edge; renders a gray "—" badge on any error.

export const Route = createFileRoute("/api/badges/certified/$id.svg")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        let value: string | null = null;
        let score: number | null = null;
        try {
          const record = await getCertification(id);
          if (record) {
            score = record.overall_score;
            value = badgeValue(record);
          }
        } catch {
          /* render gray "—" badge on any error */
        }

        const svg = renderCertifiedBadge({ value, score0to100: score });
        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300, s-maxage=300",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
