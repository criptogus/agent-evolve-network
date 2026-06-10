import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://superagentskill.com";

const STATIC_ROUTES: Array<{ path: string; priority: number; changefreq: string }> = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/connect", priority: 0.95, changefreq: "weekly" },
  { path: "/pricing", priority: 0.9, changefreq: "weekly" },
  { path: "/docs", priority: 0.9, changefreq: "weekly" },
  { path: "/docs/mcp", priority: 0.85, changefreq: "weekly" },
  { path: "/marketplace", priority: 0.85, changefreq: "daily" },
  { path: "/marketplace/rankings", priority: 0.7, changefreq: "daily" },
  { path: "/discover", priority: 0.75, changefreq: "weekly" },
  { path: "/packs", priority: 0.7, changefreq: "weekly" },
  { path: "/forge", priority: 0.7, changefreq: "weekly" },
  { path: "/skillforge", priority: 0.65, changefreq: "weekly" },
  { path: "/generate", priority: 0.65, changefreq: "weekly" },
  { path: "/match", priority: 0.6, changefreq: "monthly" },
  { path: "/evaluation", priority: 0.6, changefreq: "monthly" },
  { path: "/certify", priority: 0.6, changefreq: "monthly" },
  { path: "/community", priority: 0.6, changefreq: "weekly" },
  { path: "/login", priority: 0.4, changefreq: "yearly" },
  { path: "/signup", priority: 0.5, changefreq: "yearly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
  { path: "/refunds", priority: 0.3, changefreq: "yearly" },
  { path: "/contributor-faq", priority: 0.5, changefreq: "monthly" },
  { path: "/reset-password", priority: 0.2, changefreq: "yearly" },
  { path: "/upload", priority: 0.4, changefreq: "monthly" },
  { path: "/account/billing", priority: 0.3, changefreq: "yearly" },
];

function buildXml(urls: Array<{ loc: string; lastmod?: string; priority?: number; changefreq?: string }>) {
  const body = urls
    .map(
      (u) =>
        `<url><loc>${u.loc}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
        (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "") +
        (u.priority !== undefined ? `<priority>${u.priority.toFixed(2)}</priority>` : "") +
        `</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const urls = STATIC_ROUTES.map((r) => ({
          loc: `${SITE}${r.path}`,
          lastmod: today,
          priority: r.priority,
          changefreq: r.changefreq,
        }));
        return new Response(buildXml(urls), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
