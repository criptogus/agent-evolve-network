import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { USE_CASES } from "@/lib/seo/use-cases";
import { COMPARISONS } from "@/lib/seo/comparisons";

const supabaseAdmin = _supabaseAdmin as any;

const SITE = "https://superagentskill.com";

// Static marketing routes only — auth/account pages (/login, /reset-password,
// /account/*) are intentionally excluded from the sitemap.
const STATIC_ROUTES: Array<{ path: string; priority: number; changefreq: string }> = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/about", priority: 0.5, changefreq: "weekly" },
  { path: "/how-it-works", priority: 0.85, changefreq: "monthly" },
  { path: "/agents", priority: 0.85, changefreq: "weekly" },
  { path: "/bounties", priority: 0.6, changefreq: "daily" },
  { path: "/leaderboard", priority: 0.6, changefreq: "daily" },
  { path: "/play", priority: 0.55, changefreq: "weekly" },
  { path: "/nda", priority: 0.3, changefreq: "yearly" },
  { path: "/connect", priority: 0.95, changefreq: "weekly" },
  { path: "/pricing", priority: 0.9, changefreq: "weekly" },
  { path: "/docs", priority: 0.9, changefreq: "weekly" },
  { path: "/agents.md", priority: 0.8, changefreq: "weekly" },
  { path: "/docs/mcp", priority: 0.85, changefreq: "weekly" },
  { path: "/enterprise", priority: 0.85, changefreq: "monthly" },
  { path: "/whitepaper", priority: 0.75, changefreq: "monthly" },
  { path: "/marketplace", priority: 0.85, changefreq: "daily" },
  { path: "/marketplace/categories", priority: 0.7, changefreq: "weekly" },
  { path: "/marketplace/rankings", priority: 0.7, changefreq: "daily" },
  { path: "/discover", priority: 0.75, changefreq: "weekly" },
  { path: "/use-cases", priority: 0.7, changefreq: "weekly" },
  { path: "/packs", priority: 0.7, changefreq: "weekly" },
  { path: "/forge", priority: 0.7, changefreq: "weekly" },
  { path: "/skillforge", priority: 0.65, changefreq: "weekly" },
  { path: "/generate", priority: 0.65, changefreq: "weekly" },
  { path: "/match", priority: 0.6, changefreq: "monthly" },
  { path: "/evaluation", priority: 0.6, changefreq: "monthly" },
  { path: "/certify", priority: 0.6, changefreq: "monthly" },
  { path: "/community", priority: 0.6, changefreq: "weekly" },
  { path: "/signup", priority: 0.5, changefreq: "yearly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
  { path: "/refunds", priority: 0.3, changefreq: "yearly" },
  { path: "/contributor-faq", priority: 0.5, changefreq: "monthly" },
  { path: "/upload", priority: 0.4, changefreq: "monthly" },
];

type UrlEntry = { loc: string; lastmod?: string; priority?: number; changefreq?: string };

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildXml(urls: UrlEntry[]) {
  const body = urls
    .map(
      (u) =>
        `<url><loc>${esc(u.loc)}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
        (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "") +
        (u.priority !== undefined ? `<priority>${u.priority.toFixed(2)}</priority>` : "") +
        `</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function toLastmod(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

async function fetchPackageUrls(): Promise<UrlEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("slug,updated_at")
    .eq("is_published", true)
    .eq("review_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return (data as Array<{ slug: string; updated_at: string | null }>).map((p) => ({
    loc: `${SITE}/marketplace/${encodeURIComponent(p.slug)}`,
    lastmod: toLastmod(p.updated_at),
    priority: 0.6,
    changefreq: "weekly",
  }));
}

async function fetchCollectionUrls(): Promise<UrlEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("skill_collections")
    .select("slug,updated_at")
    .eq("is_public", true)
    .limit(1000);
  if (error || !data) return [];
  return (data as Array<{ slug: string; updated_at: string | null }>).map((c) => ({
    loc: `${SITE}/collections/${encodeURIComponent(c.slug)}`,
    lastmod: toLastmod(c.updated_at),
    priority: 0.5,
    changefreq: "weekly",
  }));
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticUrls: UrlEntry[] = STATIC_ROUTES.map((r) => ({
          loc: `${SITE}${r.path}`,
          priority: r.priority,
          changefreq: r.changefreq,
        }));

        const compareUrls: UrlEntry[] = [
          { loc: `${SITE}/compare`, priority: 0.7, changefreq: "weekly" },
          ...COMPARISONS.map((c) => ({
            loc: `${SITE}/compare/${c.slug}`,
            priority: 0.7,
            changefreq: "monthly",
          })),
        ];

        const useCaseUrls: UrlEntry[] = USE_CASES.map((u) => ({
          loc: `${SITE}/use-case/${u.vertical}/${u.task}`,
          priority: 0.65,
          changefreq: "weekly",
        }));

        const [packageUrls, collectionUrls] = await Promise.all([
          fetchPackageUrls().catch(() => [] as UrlEntry[]),
          fetchCollectionUrls().catch(() => [] as UrlEntry[]),
        ]);

        const urls = [...staticUrls, ...compareUrls, ...useCaseUrls, ...packageUrls, ...collectionUrls];
        return new Response(buildXml(urls), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
