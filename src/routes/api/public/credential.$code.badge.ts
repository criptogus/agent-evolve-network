import { createFileRoute } from "@tanstack/react-router";
import { verifyCredential } from "@/lib/university/residency.server";
import { DOMAINS } from "@/lib/university/types";

/**
 * GET /api/public/credential/<code>/badge
 *   → SVG embutível em README/PR: mostra domínio + score da residência.
 *     Credencial inválida, expirada ou revogada renderiza cinza.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(label: string, value: string, color: string): string {
  const lw = Math.max(70, label.length * 6.5 + 16);
  const vw = Math.max(46, value.length * 7 + 16);
  const w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <rect width="${w}" height="20" rx="3" fill="#1f2430"/>
  <rect x="${lw}" width="${vw}" height="20" rx="3" fill="${color}"/>
  <rect width="${w}" height="20" rx="3" fill="url(#s)" opacity=".15"/>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + vw / 2}" y="14">${esc(value)}</text>
  </g>
</svg>`;
}

export const Route = createFileRoute("/api/public/credential/$code/badge")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let label = "SAK residency";
        let value = "—";
        let color = "#6b7280";
        try {
          const result = await verifyCredential(params.code);
          const c = result.credential;
          if (c) {
            label = `SAK · ${DOMAINS.find((d) => d.id === c.domain)?.name ?? c.domain}`;
          }
          if (result.ok && c) {
            value = `${c.score}/100`;
            color = c.score >= 90 ? "#16a34a" : c.score >= 75 ? "#65a30d" : "#ca8a04";
          } else if (c) {
            value = result.reason.includes("expirada") ? "expirada" : "inválida";
            color = "#b91c1c";
          }
        } catch {
          /* renderiza cinza em qualquer erro */
        }

        return new Response(render(label, value, color), {
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
