import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getConflictPreview } from "@/lib/cloud-skills/pending-conflicts.functions";
import { collapseUnchanged, diffLines, diffStats, type DiffRow } from "@/lib/cloud-skills/line-diff";
import { keepBothPath, mergeContents } from "@/lib/cloud-skills/conflicts";
import { DECISIONS, decisionMeta, type ConflictDecision } from "@/lib/cloud-skills/pending-conflicts";

const opStyles: Record<DiffRow["op"], { left: string; right: string }> = {
  same: { left: "", right: "" },
  changed: { left: "bg-amber-500/10", right: "bg-amber-500/10" },
  removed: { left: "bg-destructive/10", right: "bg-muted/30" },
  added: { left: "bg-muted/30", right: "bg-primary/10" },
};

function Cell({ no, text, cls }: { no: number | null; text: string | null; cls: string }) {
  return (
    <div className={`flex min-w-0 gap-2 px-2 py-[2px] ${cls}`}>
      <span className="w-8 shrink-0 select-none text-right text-[10px] leading-5 text-muted-foreground/70">
        {no ?? ""}
      </span>
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-5">
        {text ?? ""}
      </pre>
    </div>
  );
}

/**
 * Side-by-side preview for one queued conflict: local file on the left, cloud
 * version on the right, plus the exact result each strategy would write.
 */
export function ConflictDiff({
  conflictId,
  decision,
  onPick,
  canMerge,
}: {
  conflictId: string;
  decision: ConflictDecision | null;
  onPick?: (d: ConflictDecision) => void;
  canMerge: boolean;
}) {
  const previewFn = useServerFn(getConflictPreview);
  const [showAll, setShowAll] = useState(false);
  const [outcome, setOutcome] = useState<ConflictDecision | null>(null);

  const q = useQuery({
    queryKey: ["cloud-skill-conflict-preview", conflictId],
    queryFn: () => previewFn({ data: { id: conflictId } }),
    staleTime: 60_000,
  });

  const data = q.data as any;
  const local = (data?.local_content ?? "") as string;
  const cloud = (data?.cloud_content ?? "") as string;

  const rows = useMemo(() => (data ? diffLines(local, cloud) : []), [data, local, cloud]);
  const stats = useMemo(() => diffStats(rows), [rows]);
  const chunks = useMemo(
    () => (showAll ? [{ type: "rows" as const, rows }] : collapseUnchanged(rows, 3)),
    [rows, showAll],
  );

  const resultText = useMemo(() => {
    if (!outcome || !data) return null;
    if (outcome === "skip") return null;
    if (outcome === "overwrite") return cloud;
    if (outcome === "keep_both") return cloud;
    return mergeContents(cloud, local);
  }, [outcome, data, cloud, local]);

  if (q.isLoading) {
    return <div className="mt-3 text-xs text-muted-foreground">Loading diff…</div>;
  }
  if (q.error) {
    return <div className="mt-3 text-xs text-destructive">Could not load the diff for this file.</div>;
  }
  if (!data?.cloud_content) {
    return (
      <div className="mt-3 text-xs text-muted-foreground">
        This skill is no longer in your cloud library, so there is nothing to compare.
      </div>
    );
  }
  if (!data.local_content) {
    return (
      <div className="mt-3 rounded-md border border-border/50 bg-background/60 p-3 text-xs text-muted-foreground">
        The agent reported a divergence but did not send the local file content, so no line-level diff is
        available. Overwrite or Keep both are the safe choices here.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[10px]">
          {stats.changed} changed
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {stats.removed} local-only
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {stats.added} cloud-only
        </Badge>
        <span className="text-muted-foreground">
          {stats.same} identical line{stats.same === 1 ? "" : "s"}
        </span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Changes only" : "Show full files"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border/60">
        <div className="grid grid-cols-2 border-b border-border/60 bg-muted/40 text-[11px] font-medium">
          <div className="border-r border-border/60 px-3 py-1.5">Local file on disk</div>
          <div className="px-3 py-1.5">
            Cloud version{data.cloud_version ? ` · v${data.cloud_version}` : ""}
          </div>
        </div>
        <div className="max-h-80 overflow-auto">
          {chunks.map((chunk, ci) =>
            chunk.type === "gap" ? (
              <div
                key={`gap-${ci}`}
                className="border-y border-border/40 bg-muted/20 px-3 py-1 text-center text-[10px] text-muted-foreground"
              >
                {chunk.hidden} unchanged line{chunk.hidden === 1 ? "" : "s"} hidden
              </div>
            ) : (
              chunk.rows.map((r, ri) => (
                <div key={`r-${ci}-${ri}`} className="grid grid-cols-2">
                  <div className="border-r border-border/40">
                    <Cell no={r.leftNo} text={r.left} cls={opStyles[r.op].left} />
                  </div>
                  <Cell no={r.rightNo} text={r.right} cls={opStyles[r.op].right} />
                </div>
              ))
            ),
          )}
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-background/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview result of:</span>
          {DECISIONS.filter((d) => !d.needsLocalContent || canMerge).map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={outcome === d.id ? "secondary" : "ghost"}
              className="h-6 px-2 text-xs"
              onClick={() => setOutcome(outcome === d.id ? null : d.id)}
            >
              {d.label}
            </Button>
          ))}
        </div>

        {outcome && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground">{decisionMeta(outcome)?.description}</p>
            <div className="font-mono text-[11px] text-muted-foreground">
              Writes: {outcome === "keep_both" ? keepBothPath(data.path) : outcome === "skip" ? "nothing" : data.path}
            </div>
            {resultText ? (
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded border border-border/50 bg-muted/20 p-2 font-mono text-[11px] leading-5">
                {resultText}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">The local file stays exactly as it is.</p>
            )}
            {onPick && (
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={decision === outcome}
                onClick={() => onPick(outcome)}
              >
                {decision === outcome ? "Already selected" : `Use ${decisionMeta(outcome)?.label}`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
