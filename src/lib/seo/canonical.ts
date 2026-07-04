export const SITE_URL = "https://superagentskill.com";

/**
 * Canonical <link> descriptor for a route's head() `links` array.
 *
 *   links: [canonicalLink("/pricing")]
 */
export function canonicalLink(path: string): { rel: "canonical"; href: string } {
  const normalized = path === "/" ? "/" : path.replace(/\/+$/, "");
  return { rel: "canonical", href: `${SITE_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}` };
}
