import { useEffect, useState } from "react";
import { GitFork, GitBranch, Percent } from "lucide-react";
import { supabase as _supabase } from "@/integrations/supabase/client";
// Cast: types.ts is mid-regen for package_lineage; remove once types catch up.
const supabase = _supabase as any;

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
 * Renders lineage attribution for a package — visible proof of the
 * revenue-share moat:
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
          .select(
            "fork_kind, rev_share_bps, parent_package_id, packages!package_lineage_parent_package_id_fkey(slug,name)",
          )
          .eq("child_package_id", packageId)
          .maybeSingle(),
        supabase
          .from("package_lineage")
          .select("child_package_id", { count: "exact", head: true })
          .eq("parent_package_id", packageId),
      ]);
      if (cancel) return;
      const parentRow = pq.data as
        | {
            fork_kind: string;
            rev_share_bps: number;
            packages: { slug: string; name: string } | null;
          }
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
    return () => {
      cancel = true;
    };
  }, [packageId]);

  if (!parent && (!children || children.count === 0)) return null;

  return (
    <aside className="my-6 overflow-hidden rounded-xl border border-border bg-surface/40">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <GitFork className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        Lineage
      </header>
      <div className="divide-y divide-border">
        {parent && (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GitBranch className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium capitalize">{parent.fork_kind}</span> of{" "}
                <a
                  href={`/packs/${parent.slug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {parent.name}
                </a>
              </p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Percent className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                {(parent.rev_share_bps / 100).toFixed(2)}% goes to upstream author
              </p>
            </div>
          </div>
        )}
        {children && children.count > 0 && (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GitFork className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-sm">
              <a href={`/packs/${packageId}/forks`} className="font-medium text-primary underline-offset-4 hover:underline">
                {children.count} {children.count === 1 ? "fork" : "forks"}
              </a>{" "}
              downstream pay revenue back to this package.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
