// Lineage helpers: derive the upstream chain for a forked package.
// Stops at depth 5 and ignores cycles defensively.

export interface LineageEdge {
  child_package_id: string;
  parent_package_id: string;
  upstream_user_id: string;
  rev_share_bps: number;
}

export type EdgeLookup = (childId: string) => Promise<LineageEdge | null>;

export async function ancestry(packageId: string, lookup: EdgeLookup, maxDepth = 5) {
  const out: LineageEdge[] = [];
  const seen = new Set<string>([packageId]);
  let current = packageId;
  for (let i = 0; i < maxDepth; i++) {
    const edge = await lookup(current);
    if (!edge) break;
    if (seen.has(edge.parent_package_id)) break;
    out.push(edge);
    seen.add(edge.parent_package_id);
    current = edge.parent_package_id;
  }
  return out;
}
