import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DECISIONS,
  availableDecisions,
  decisionMeta,
  groupConflicts,
  type ConflictDecision,
  type PendingConflict,
} from "@/lib/cloud-skills/pending-conflicts";
import {
  listPendingConflicts,
  decidePendingConflicts,
  dismissPendingConflicts,
  confirmPendingConflicts,
} from "@/lib/cloud-skills/pending-conflicts.functions";

function download(filename: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * "Pending conflicts" queue: every file an agent could not sync because a
 * different version already exists on disk. One decision per file, then a
 * single final confirmation that closes the sync and hands back the exact files.
 */
export function PendingConflicts() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingConflicts);
  const decideFn = useServerFn(decidePendingConflicts);
  const dismissFn = useServerFn(dismissPendingConflicts);
  const confirmFn = useServerFn(confirmPendingConflicts);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["cloud-skill-conflicts"],
    queryFn: () => listFn(),
  });

  const groups = useMemo(
    () => groupConflicts(((q.data as any)?.items ?? []) as PendingConflict[]),
    [q.data],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cloud-skill-conflicts"] });

  const decideMut = useMutation({
    mutationFn: (v: { ids: string[]; decision: ConflictDecision }) => decideFn({ data: v }),
    onSuccess: (_r, v) => {
      invalidate();
      const meta = decisionMeta(v.decision);
      toast.success(
        v.ids.length === 1 ? `Set to ${meta?.label ?? v.decision}` : `${v.ids.length} files set to ${meta?.label}`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save that decision"),
  });

  const dismissMut = useMutation({
    mutationFn: (ids: string[]) => dismissFn({ data: { ids } }),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from the queue. No files were touched.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove that entry"),
  });

  const confirmMut = useMutation({
    mutationFn: (v: { tool: string; scope: "project" | "global" }) =>
      confirmFn({ data: { ...v, dry_run: false } }),
    onSuccess: (r: any) => {
      setConfirmKey(null);
      invalidate();
      if (r.archive) download(r.archive.filename, r.archive.base64);
      toast.success(
        `Sync finished: ${r.files.length} file${r.files.length === 1 ? "" : "s"} resolved for ${r.tool.label}.`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not finish the sync"),
  });

  const group = groups.find((g) => g.key === confirmKey) ?? null;

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground">Checking for pending conflicts…</div>;
  }

  if (!groups.length) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          No pending conflicts
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When an agent syncs your library with <code className="text-xs">conflict_strategy: "ask"</code> and a
          different file already exists on disk, it lands here so you can decide file by file.
        </p>
      </div>
    );
  }

  const totalOpen = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending conflicts
            <Badge variant="secondary">{totalOpen}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose what happens to each file, then confirm to finish the sync.
          </p>
        </div>
      </div>

      {groups.map((g) => {
        const expanded = openKey === g.key;
        return (
          <div key={g.key} className="rounded-lg border border-border/60 bg-card/40">
            <button
              type="button"
              onClick={() => setOpenKey(expanded ? null : g.key)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {g.label}
                  <Badge variant="outline" className="text-xs capitalize">
                    {g.scope}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {g.items.length} file{g.items.length === 1 ? "" : "s"} · {g.decided} decided
                  {g.ready ? " · ready to finish" : ""}
                </p>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="space-y-3 border-t border-border/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Apply to all:</span>
                  {DECISIONS.map((d) => (
                    <Button
                      key={d.id}
                      size="sm"
                      variant="outline"
                      disabled={decideMut.isPending}
                      onClick={() =>
                        decideMut.mutate({
                          ids: g.items
                            .filter((i) => !d.needsLocalContent || i.has_local_content)
                            .map((i) => i.id),
                          decision: d.id,
                        })
                      }
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>

                {g.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-border/50 bg-background/60 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs">{item.path}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.detail ?? "Local file differs from the cloud version."}
                          {item.local_only_lines
                            ? ` (${item.local_only_lines} local-only line${item.local_only_lines === 1 ? "" : "s"})`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.decision ? (
                          <Badge className="text-xs">{decisionMeta(item.decision)?.label}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Remove from queue"
                          disabled={dismissMut.isPending}
                          onClick={() => dismissMut.mutate([item.id])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableDecisions(item).map((d) => (
                        <Button
                          key={d.id}
                          size="sm"
                          variant={item.decision === d.id ? "default" : "outline"}
                          title={d.description}
                          disabled={decideMut.isPending}
                          onClick={() => decideMut.mutate({ ids: [item.id], decision: d.id })}
                        >
                          {d.label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => setDiffId(diffId === item.id ? null : item.id)}
                      >
                        <GitCompare className="h-4 w-4" />
                        {diffId === item.id ? "Hide diff" : "Compare side by side"}
                      </Button>
                      {!item.has_local_content && (
                        <span className="self-center text-xs text-muted-foreground">
                          Merge needs the local file content, which this agent did not send.
                        </span>
                      )}
                    </div>

                    {diffId === item.id && (
                      <ConflictDiff
                        conflictId={item.id}
                        decision={item.decision}
                        canMerge={item.has_local_content}
                        onPick={(d) => decideMut.mutate({ ids: [item.id], decision: d })}
                      />
                    )}
                  </div>

                ))}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={dismissMut.isPending}
                    onClick={() => dismissMut.mutate(g.items.map((i) => i.id))}
                  >
                    Discard queue
                  </Button>
                  <Button size="sm" disabled={!g.ready} onClick={() => setConfirmKey(g.key)}>
                    Finish sync for {g.label}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={!!group} onOpenChange={(o) => !o && setConfirmKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Finish sync for {group?.label}</DialogTitle>
            <DialogDescription>
              Review the decisions below. Confirming closes these conflicts and downloads a private zip with the
              resolved files, laid out exactly where {group?.label} expects them.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {group?.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded border border-border/50 p-2">
                <span className="truncate font-mono text-xs">{i.path}</span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {decisionMeta(i.decision)?.label ?? "Waiting"}
                </Badge>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmKey(null)}>
              Cancel
            </Button>
            <Button
              disabled={confirmMut.isPending || !group}
              onClick={() =>
                group && confirmMut.mutate({ tool: group.provider, scope: group.scope })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              {confirmMut.isPending ? "Finishing…" : "Confirm and finish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
