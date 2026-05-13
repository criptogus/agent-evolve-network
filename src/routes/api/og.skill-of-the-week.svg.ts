import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// GET /api/og/skill-of-the-week.svg
//
// Dynamic Open Graph image for /skill-of-the-week. SVG (1200×630) so it stays
// crisp at every social platform's downscale step without an image pipeline.
// Caches at the edge for 15 minutes — the underlying selection only changes
// weekly.

export const Route = createFileRoute("/api/og/skill-of-the-week.svg")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabaseAdmin
          .from("skill_of_the_week")
          .select("week_starting,trust_score,adversarial_pass_rate,installs_7d,packages(slug,name,description)")
          .order("week_starting", { ascending: false })
          .limit(1)
          .maybeSingle();

        const winner = data as
          | {
              week_starting: string;
              trust_score: number | null;
              adversarial_pass_rate: number | null;
              installs_7d: number | null;
              packages: { slug: string; name: string; description: string | null } | null;
            }
          | null;

        const title = winner?.packages?.name ?? "Skill of the Week";
        const subtitle = winner?.packages?.description?.slice(0, 110) ?? "Picked weekly from signed, adversarially tested skills.";
        const trust = winner?.trust_score != null ? `${Math.round(Number(winner.trust_score) * 100)}%` : "—";
        const adv = winner?.adversarial_pass_rate != null ? `${Math.round(Number(winner.adversarial_pass_rate) * 100)}%` : "—";
        const installs = winner?.installs_7d?.toLocaleString() ?? "—";
        const week = winner?.week_starting
          ? new Date(winner.week_starting).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "";

        const svg = renderOg({ title, subtitle, trust, adv, installs, week });
        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=900, s-maxage=900",
          },
        });
      },
    },
  },
});

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function renderOg(o: { title: string; subtitle: string; trust: string; adv: string; installs: string; week: string }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#0a0a0a"/>
    <stop offset="1" stop-color="#1a1a2e"/>
  </linearGradient>
  <linearGradient id="primary" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#0a66ff"/>
    <stop offset="1" stop-color="#8b5cf6"/>
  </linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial">
  <text x="64" y="90" fill="#94a3b8" font-size="22" letter-spacing="3" text-transform="uppercase">SUPER · AGENT · SKILL</text>
  <text x="64" y="140" fill="url(#primary)" font-size="32" font-weight="700">Skill of the Week ${o.week ? `· ${esc(o.week)}` : ""}</text>
  <text x="64" y="240" fill="#f8fafc" font-size="72" font-weight="700">${esc(o.title)}</text>
  <foreignObject x="64" y="280" width="1072" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#cbd5e1;font-size:28px;line-height:1.4;font-family:ui-sans-serif,system-ui,sans-serif">${esc(o.subtitle)}</div>
  </foreignObject>
  <g transform="translate(64,460)">
    <rect width="320" height="120" rx="16" fill="#111827" stroke="#1f2937" />
    <text x="20" y="36" fill="#94a3b8" font-size="14" letter-spacing="2" text-transform="uppercase">Trust score</text>
    <text x="20" y="92" fill="#10b981" font-size="56" font-weight="700">${esc(o.trust)}</text>

    <rect x="360" width="320" height="120" rx="16" fill="#111827" stroke="#1f2937" />
    <text x="380" y="36" fill="#94a3b8" font-size="14" letter-spacing="2" text-transform="uppercase">Adversarial</text>
    <text x="380" y="92" fill="#0a66ff" font-size="56" font-weight="700">${esc(o.adv)}</text>

    <rect x="720" width="320" height="120" rx="16" fill="#111827" stroke="#1f2937" />
    <text x="740" y="36" fill="#94a3b8" font-size="14" letter-spacing="2" text-transform="uppercase">Installs (7d)</text>
    <text x="740" y="92" fill="#f8fafc" font-size="56" font-weight="700">${esc(o.installs)}</text>
  </g>
</g>
</svg>`;
}
