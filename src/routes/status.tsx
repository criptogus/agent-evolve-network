import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SitePage } from "@/components/site/SitePage";

type Health = {
  ok: boolean;
  version: string;
  uptime_seconds: number;
  db: { ok: boolean; ping_ms: number | null };
  endpoint: string;
  checked_at: string;
};

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Super Agent Skill" },
      {
        name: "description",
        content:
          "Live status of the Super Agent Skill MCP endpoint and database. Public health endpoint at /api/mcp/health.",
      },
    ],
  }),
  component: StatusPage,
});

function formatUptime(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/mcp/health", { cache: "no-store" });
        const j = (await r.json()) as Health;
        if (!cancelled) {
          setHealth(j);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      }
    }
    void tick();
    const id = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ok = !!health?.ok && !error;

  return (
    <SitePage>
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Status</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Super Agent Skill MCP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live health of the MCP endpoint at{" "}
          <code className="font-mono text-xs">/api/mcp</code>. The raw JSON probe is at{" "}
          <code className="font-mono text-xs">/api/mcp/health</code> — wire it into your own
          status dashboard if you want to be notified before we are.
        </p>

        <div
          className={`mt-8 rounded-2xl border p-5 ${
            ok
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${
                ok ? "animate-pulse bg-emerald-500" : "bg-destructive"
              }`}
            />
            <span className="text-lg font-semibold">
              {ok ? "All systems operational" : error ? "Status check failed" : "Degraded"}
            </span>
          </div>
          {error && (
            <p className="mt-3 text-xs text-destructive">
              Could not reach /api/mcp/health: {error}
            </p>
          )}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Database" value={health?.db.ok ? "OK" : "—"} ok={health?.db.ok} />
          <Stat
            label="DB latency"
            value={health?.db.ping_ms != null ? `${health.db.ping_ms} ms` : "—"}
          />
          <Stat label="Version" value={health?.version ?? "—"} />
          <Stat
            label="Uptime"
            value={health?.uptime_seconds != null ? formatUptime(health.uptime_seconds) : "—"}
          />
          <Stat
            label="Last checked"
            value={health?.checked_at ? new Date(health.checked_at).toLocaleTimeString() : "—"}
          />
        </dl>

        <p className="mt-8 text-xs text-muted-foreground">
          This page polls /api/mcp/health every 15 seconds. Incidents are reported on the
          GitHub repo — subscribe to releases there for the canonical history.
        </p>
      </main>
    </SitePage>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${ok === false ? "text-destructive" : ""}`}>
        {value}
      </div>
    </div>
  );
}
