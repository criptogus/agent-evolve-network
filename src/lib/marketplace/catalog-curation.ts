export type CurationPackage = {
  slug: string;
  name: string;
  description: string;
  license: string;
  author_handle: string;
  type: string;
};
const words = (value: string) =>
  new Set(
    value
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter(
        (w) =>
          ![
            "the",
            "and",
            "for",
            "with",
            "that",
            "this",
            "skill",
            "agent",
            "from",
            "into",
            "para",
            "uma",
            "com",
            "que",
          ].includes(w),
      ) ?? [],
  );
export function findCatalogOverlap(packages: CurationPackage[]) {
  const tokens = packages.map((p) => words(`${p.name} ${p.description}`));
  const pairs = [];
  for (let i = 0; i < packages.length; i++)
    for (let j = i + 1; j < packages.length; j++) {
      const a = packages[i],
        b = packages[j];
      if (a.type !== b.type) continue;
      const shared = [...tokens[i]].filter((t) => tokens[j].has(t));
      const union = new Set([...tokens[i], ...tokens[j]]).size;
      const score = union ? shared.length / union : 0;
      const exactName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
      if (!exactName && (shared.length < 4 || score < 0.6)) continue;
      pairs.push({
        left: a.slug,
        right: b.slug,
        score: Math.round(score * 1000) / 1000,
        exact_name: exactName,
        shared_terms: shared.sort(),
        same_license: a.license === b.license,
        same_author: a.author_handle === b.author_handle,
        review:
          "Compare input/output contracts, examples, behavior and provenance before any consolidation. No automatic merge or deletion.",
      });
    }
  return pairs.sort(
    (a, b) =>
      Number(b.exact_name) - Number(a.exact_name) ||
      b.score - a.score ||
      a.left.localeCompare(b.left),
  );
}
