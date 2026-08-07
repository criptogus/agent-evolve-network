/**
 * Recommendation ranking for "Ready to install" surfaces.
 *
 * Trust Score alone surfaces niche, deeply-audited packages (e.g. "Expo EAS
 * pipeline", "OAuth flow auditor") that most people can't use. This ranks by
 * real-world popularity first, keeps Trust as a quality signal rather than the
 * primary sort, and demotes narrow platform-specific packages.
 */

export type RankableItem = {
  slug: string;
  name: string;
  description: string;
  type: string;
  install_count: number;
  rating_avg: number;
  rating_count: number;
  trust_score: number | null;
  vertical?: string | null;
};

/** Broadly useful work most teams do, regardless of stack. */
const BROAD = [
  "code review",
  "code-review",
  "review",
  "debug",
  "test",
  "documentation",
  "docs",
  "writing",
  "research",
  "summar",
  "email",
  "meeting",
  "planning",
  "roadmap",
  "product",
  "spec",
  "data analysis",
  "spreadsheet",
  "sql",
  "report",
  "support",
  "customer",
  "sales",
  "marketing",
  "content",
  "seo",
  "copy",
  "hiring",
  "interview",
  "onboarding",
  "refactor",
  "git",
  "pull request",
  "incident",
  "security review",
  "prompt",
  "agent",
];

/** Narrow, platform- or stack-specific topics that only fit some projects. */
const NICHE = [
  "expo",
  "eas",
  "oauth",
  "saml",
  "kubernetes",
  "k8s",
  "helm",
  "terraform",
  "ansible",
  "solidity",
  "web3",
  "blockchain",
  "unity",
  "unreal",
  "swiftui",
  "xcode",
  "android ndk",
  "flutter",
  "rust macro",
  "wasm",
  "graphql federation",
  "kafka",
  "airflow",
  "dbt",
  "hipaa",
  "fhir",
  "hl7",
  "pci",
  "fedramp",
  "sap",
  "salesforce apex",
  "mainframe",
  "cobol",
];

function matches(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/** Higher is better. */
export function recommendationScore(item: RankableItem): number {
  const text = `${item.name} ${item.description} ${item.vertical ?? ""}`.toLowerCase();

  // Popularity dominates: log-scaled installs plus rating weighted by volume.
  const popularity = Math.log10(1 + Math.max(0, item.install_count)) * 3;
  const ratingWeight = Math.min(1, item.rating_count / 5);
  const rating = (item.rating_avg / 5) * 1.5 * ratingWeight;

  // Trust is a quality signal, not the headline sort.
  const trust = (item.trust_score ?? 0.5) * 1.2;

  const breadth = matches(text, BROAD) ? 0.8 : 0;
  const nichePenalty = matches(text, NICHE) ? 1.6 : 0;

  return popularity + rating + trust + breadth - nichePenalty;
}

/**
 * Popular, broadly applicable packages first. Packages with a known-low Trust
 * Score (< 0.4) are dropped so popularity never promotes untested content.
 */
export function rankRecommended<T extends RankableItem>(items: T[], limit = 6): T[] {
  return items
    .filter((i) => i.trust_score === null || i.trust_score >= 0.4)
    .map((i) => ({ i, s: recommendationScore(i) }))
    .sort((a, b) => b.s - a.s || b.i.install_count - a.i.install_count)
    .slice(0, limit)
    .map((x) => x.i);
}

/** True when the package targets work most teams do, regardless of stack. */
export function isBroadPurpose(item: {
  name: string;
  description: string;
  vertical?: string | null;
}): boolean {
  const text = `${item.name} ${item.description} ${item.vertical ?? ""}`.toLowerCase();
  return matches(text, BROAD) && !matches(text, NICHE);
}

/** True when the package is narrow / stack- or compliance-specific. */
export function isNichePurpose(item: {
  name: string;
  description: string;
  vertical?: string | null;
}): boolean {
  const text = `${item.name} ${item.description} ${item.vertical ?? ""}`.toLowerCase();
  return matches(text, NICHE);
}

/**
 * Beginner-friendly = broadly useful, already proven by other users, and above
 * the Trust bar. Deliberately conservative: a first install should not fail.
 */
export function isBeginnerFriendly(item: {
  name: string;
  description: string;
  vertical?: string | null;
  install_count: number;
  rating_avg: number;
  rating_count: number;
  trust_score: number | null;
}): boolean {
  if (isNichePurpose(item)) return false;
  const proven = item.install_count >= 25 || (item.rating_count >= 3 && item.rating_avg >= 4);
  const trusted = (item.trust_score ?? 0) >= 0.6;
  return proven && trusted && isBroadPurpose(item);
}
