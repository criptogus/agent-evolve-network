import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ParentInfo {
  slug: string;
  name: string;
  fork_kind: string;
  rev_share_bps: number;
}

interface ChildSummary {
  count: number;
}

/**
 * Renders lineage attribution for a package:
 *  - if this package was forked, link back to upstream and disclose rev-share
 *  - if other packages forked this one, surface descendant count
 */
export function LineageCard({ packageId }: { packageId: string }) {
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [children, setChildren] = useState<ChildSummary | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [pq, cq] = await Promise.all([
        supabase
          .from("package_lineage")
          .select("fork_kind, rev_share_bps, parent_package_id, packages!package_lineage_parent_package_id_fkey(slug,name)")
          .eq("child_package_id", packageId)
          .maybeSingle(),
        supabase
          .from("package_lineage")
          .select("child_package_id", { count: "exact", head: true })
          .eq("parent_package_id", packageId),
      ]);
      if (cancel) return;
      const parentRow = pq.data as
        | { fork_kind: string; rev_share_bps: number; packages: { slug: string; name: string } | null }
        | null;
      if (parentRow?.packages) {
        setParent({
          slug: parentRow.packages.slug,
          name: parentRow.packages.name,
          fork_kind: parentRow.fork_kind,
          rev_share_bps: parentRow.rev_share_bps,
        });
      }
      setChildren({ count: cq.count ?? 0 });
    })();
    return () => { cancel = true; };
  }, [packageId]);

  if (!parent && (!children || children.count === 0)) return null;

  return (
    <aside className="border rounded-lg p-4 bg-muted/30 my-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lineage</h3>
      {parent && (
        <p className="text-sm">
          <span className="font-medium capitalize">{parent.fork_kind}</span> of{" "}
          <a href={`/packs/${parent.slug}`} className="underline">{parent.name}</a>.
          {" "}Upstream receives{" "}
          <span className="font-mono">{(parent.rev_share_bps / 100).toFixed(2)}%</span> of every sale.
        </p>
      )}
      {children && children.count > 0 && (
        <p className="text-sm mt-2">
          <a href={`/packs/${packageId}/forks`} className="underline">
            {children.count} {children.count === 1 ? "fork" : "forks"}
          </a>{" "}
          downstream contribute revenue back here.
        </p>
      )}
    </aside>
  );
}
