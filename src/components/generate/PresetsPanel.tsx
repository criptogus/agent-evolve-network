import type { Preset } from "@/lib/generate/types";
import { relTime } from "@/lib/generate/presets";

export function PresetsPanel({
  presets,
  tagFilter,
  setTagFilter,
  onLoad,
  onRun,
  onDelete,
  running,
}: {
  presets: Preset[];
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;
  onLoad: (p: Preset) => void;
  onRun: (p: Preset) => void;
  onDelete: (id: string) => void;
  running: boolean;
}) {
  const allTags = Array.from(new Set(presets.flatMap((p) => p.tags))).sort();
  const filtered = tagFilter ? presets.filter((p) => p.tags.includes(tagFilter)) : presets;

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="text-sm font-medium">Presets</div>
          <div className="text-xs text-muted-foreground">
            Save commands with name + tags. Re-run any time and compare last results side by side.
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider " +
                (tagFilter === null
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-mono " +
                  (tagFilter === t
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </header>

      {presets.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No presets yet. Click <span className="text-foreground">★ Save preset</span> above to
          bookmark a command for later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No presets match the filter <span className="text-foreground">#{tagFilter}</span>.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((p) => (
            <li key={p.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground md:ml-0">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{p.prompt}</p>
                {p.lastRun ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <span>
                      last run · <span className="text-foreground">{relTime(p.lastRun.at)}</span>
                    </span>
                    <span>
                      pkgs <span className="text-foreground">{p.lastRun.artifacts}</span>
                    </span>
                    <span>
                      Δhealth{" "}
                      <span
                        className={
                          p.lastRun.healthDelta >= 0 ? "text-signal-foreground" : "text-destructive"
                        }
                      >
                        {p.lastRun.healthDelta >= 0 ? "+" : ""}
                        {p.lastRun.healthDelta.toFixed(1)}
                      </span>
                    </span>
                    <span>
                      Δprecision{" "}
                      <span
                        className={
                          p.lastRun.precisionDelta >= 0
                            ? "text-signal-foreground"
                            : "text-destructive"
                        }
                      >
                        {p.lastRun.precisionDelta >= 0 ? "+" : ""}
                        {p.lastRun.precisionDelta.toFixed(1)}
                      </span>
                    </span>
                    <span>
                      Δlatency{" "}
                      <span
                        className={
                          p.lastRun.latencyDelta >= 0
                            ? "text-signal-foreground"
                            : "text-destructive"
                        }
                      >
                        {p.lastRun.latencyDelta >= 0 ? "-" : "+"}
                        {Math.abs(p.lastRun.latencyDelta)}ms
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                    not run yet
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => onRun(p)}
                  disabled={running}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => onLoad(p)}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-destructive"
                  title="Delete preset"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
