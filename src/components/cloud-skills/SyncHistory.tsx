import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PROVIDERS } from "@/lib/cloud-skills/providers";
import {
  SYNC_SOURCE_LABELS,
  SYNC_STATUS_LABELS,
  summarizeSyncEvent,
  type SyncSource,
  type SyncStatus,
} from "@/lib/cloud-skills/sync-log";
import {
  getSyncEvent,
  listSyncEvents,
  syncHistorySummary,
} from "@/lib/cloud-skills/history.functions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ok: "default",
  partial: "secondary",
  pending_conflicts: "secondary",
  no_changes: "outline",
  error: "destructive",
};

function when(iso: string) {
  return new Date(iso).toLocaleString();
}

function label(map: Record<string, string>, key: string) {
  return map[key] ?? key;
}

/** Per-provider / per-scope sync history with full audit detail. */
export function SyncHistory() {
  const listFn = useServerFn(listSyncEvents);
  const summaryFn = useServerFn(syncHistorySummary);
  const detailFn = useServerFn(getSyncEvent);

  const [provider, setProvider] = useState<string | undefined>();
  const [scope, setScope] = useState<"project" | "global" | undefined>();
  const [status, setStatus] = useState<SyncStatus | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["sync-history-summary"],
    queryFn: () => summaryFn({ data: {} as never }),
  });

  const events = useQuery({
    queryKey: ["sync-history", provider, scope, status],
    queryFn: () =>
      listFn({
        data: {
          ...(provider ? { provider } : {}),
          ...(scope ? { scope } : {}),
          ...(status ? { status } : {}),
          limit: 25,
          offset: 0,
        },
      }),
  });

  const detail = useQuery({
    queryKey: ["sync-event", openId],
    queryFn: () => detailFn({ data: { id: openId! } }),
    enabled: !!openId,
  });

  const usedProviders = new Set((summary.data?.targets ?? []).map((t: any) => t.provider));
  const filterable = PROVIDERS.filter((p) => usedProviders.has(p.id));

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Sync history &amp; audit log</h2>
        <Badge variant="secondary">Only you can see this</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Every sync and private export, per tool and per scope: what was written, what was
        skipped, which conflicts appeared and how they were resolved.
      </p>

      {/* Per-target rollup */}
      {summary.data?.targets?.length ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {summary.data.targets.map((t: any) => (
            <button
              key={`${t.provider}:${t.scope}`}
              onClick={() => {
                setProvider(t.provider);
                setScope(t.scope);
                setStatus(undefined);
              }}
              className="rounded-xl border border-border/60 bg-background/60 p-3 text-left transition hover:border-border"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t.provider_label}</span>
                <Badge variant={STATUS_VARIANT[t.last_status] ?? "outline"}>
                  {label(SYNC_STATUS_LABELS, t.last_status)}
                </Badge>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {t.scope} · {t.syncs} sync{t.syncs === 1 ? "" : "s"} · {t.files_written} files ·{" "}
                {t.conflicts} conflict{t.conflicts === 1 ? "" : "s"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Last: {when(t.last_synced_at)}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!provider && !scope && !status ? "default" : "outline"}
          onClick={() => {
            setProvider(undefined);
            setScope(undefined);
            setStatus(undefined);
          }}
        >
          All
        </Button>
        {filterable.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={provider === p.id ? "default" : "outline"}
            onClick={() => setProvider(provider === p.id ? undefined : p.id)}
          >
            {p.label}
          </Button>
        ))}
        {(["project", "global"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={scope === s ? "secondary" : "outline"}
            onClick={() => setScope(scope === s ? undefined : s)}
          >
            {s}
          </Button>
        ))}
        {(["error", "pending_conflicts"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "secondary" : "outline"}
            onClick={() => setStatus(status === s ? undefined : s)}
          >
            {label(SYNC_STATUS_LABELS, s)}
          </Button>
        ))}
      </div>

      {/* Event list */}
      <div className="mt-4 rounded-xl border border-border/60">
        {events.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading history...</p>
        ) : !events.data?.events?.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            No syncs recorded yet. Run a sync from your agent or export a private .zip and it
            will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.data.events.map((e: any) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>
                  {label(SYNC_STATUS_LABELS, e.status)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{summarizeSyncEvent(e)}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {when(e.created_at)} ·{" "}
                    {label(SYNC_SOURCE_LABELS, e.source as SyncSource)}
                    {e.strategy ? ` · ${e.strategy}` : ""}
                    {e.client_name ? ` · ${e.client_name}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenId(e.id)}>
                  Details
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {events.data?.total ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {events.data.events.length} of {events.data.total} recorded events.
        </p>
      ) : null}

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Sync detail</SheetTitle>
            <SheetDescription>
              Exactly what this run changed on disk, kept for your own auditing.
            </SheetDescription>
          </SheetHeader>

          {detail.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading...</p>
          ) : detail.data?.event ? (
            <div className="mt-6 space-y-6 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANT[detail.data.event.status] ?? "outline"}>
                  {label(SYNC_STATUS_LABELS, detail.data.event.status)}
                </Badge>
                <Badge variant="outline">
                  {detail.data.event.provider_label ?? detail.data.event.provider}
                </Badge>
                <Badge variant="outline">{detail.data.event.scope}</Badge>
                <Badge variant="secondary">
                  {label(SYNC_SOURCE_LABELS, detail.data.event.source as SyncSource)}
                </Badge>
                {detail.data.event.strategy && (
                  <Badge variant="outline">strategy: {detail.data.event.strategy}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["skills considered", detail.data.event.skill_count],
                  ["files written", detail.data.event.written_count],
                  ["skipped", detail.data.event.skipped_count],
                  ["conflicts", detail.data.event.conflict_count],
                  ["unresolved", detail.data.event.unresolved_count],
                  ["local-only", detail.data.event.orphan_count],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between rounded border px-2 py-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>

              {detail.data.event.error && (
                <div className="rounded border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs">
                  {detail.data.event.error}
                </div>
              )}

              <section>
                <h3 className="mb-2 text-sm font-semibold">Changes applied</h3>
                {detail.data.event.changes?.length ? (
                  <ul className="space-y-1">
                    {detail.data.event.changes.map((c: any, i: number) => (
                      <li
                        key={`${c.path}-${i}`}
                        className="rounded border border-border/60 px-2 py-1 font-mono text-xs"
                      >
                        <span
                          className={
                            c.action === "skip" ? "text-muted-foreground" : "text-foreground"
                          }
                        >
                          [{c.action}]
                        </span>{" "}
                        <span className="break-all">{c.path}</span>
                        {c.version ? <span className="text-muted-foreground"> v{c.version}</span> : null}
                        {c.conflict ? <span className="text-amber-500"> conflict</span> : null}
                        {c.note ? (
                          <div className="mt-0.5 font-sans text-[11px] text-muted-foreground">
                            {c.note}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No file changes recorded.</p>
                )}
              </section>

              {detail.data.event.conflicts?.length ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Conflicts</h3>
                  <pre className="max-h-72 overflow-auto rounded border border-border/60 bg-background/60 p-3 font-mono text-[11px]">
                    {JSON.stringify(detail.data.event.conflicts, null, 2)}
                  </pre>
                </section>
              ) : null}

              {detail.data.event.orphans?.length ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Local-only skills (not deleted)</h3>
                  <p className="font-mono text-xs">{detail.data.event.orphans.join(", ")}</p>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Could not load this event.</p>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
