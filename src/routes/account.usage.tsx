import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getMyUsage } from "@/lib/account/usage.functions";

export const Route = createFileRoute("/account/usage")({
  head: () => ({
    meta: [
      { title: "Usage — Super Agent Skill" },
      { name: "description", content: "Track your plan, monthly runs, installed packages and remaining quota." },
    ],
  }),
  component: UsagePage,
});

function pct(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsagePage() {
  const fn = useServerFn(getMyUsage);
  const q = useQuery({ queryKey: ["account", "usage"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Usage & limits</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Live snapshot of your current billing period. Quotas reset on the 1st of every month.
        </p>

        {q.isLoading && (
          <div className="mt-10 rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {q.isError && (
          <div className="mt-10 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
            <div className="font-semibold text-destructive">You need to be signed in to see usage.</div>
            <Link to="/connect" className="mt-2 inline-block text-primary">Connect your agent →</Link>
          </div>
        )}
        {q.data && (
          <div className="mt-8 grid gap-6">
            {/* Plan card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{q.data.plan?.name ?? "Free"}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {(q.data.plan?.price_cents ?? 0) === 0
                    ? "Free tier"
                    : `$${((q.data.plan?.price_cents ?? 0) / 100).toFixed(0)} / month`}
                </div>
              </div>
              <Link
                to="/pricing"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                Upgrade
              </Link>
            </div>

            {/* Quota bars */}
            <div className="grid gap-6 md:grid-cols-2">
              <QuotaCard
                label="Runs this month"
                used={q.data.runs.used}
                limit={q.data.runs.limit}
                hint={`OK ${q.data.runs.by_status.ok} · errors ${q.data.runs.by_status.error} · blocked ${q.data.runs.by_status.blocked}`}
              />
              <QuotaCard
                label="Installed packages"
                used={q.data.installs.used}
                limit={q.data.installs.limit}
                hint={q.data.installs.over_limit ? "At cap — uninstall to add more" : "Within plan limit"}
              />
            </div>

            {/* Recent runs */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recent runs</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Packages</th><th className="py-2 pr-4">Latency</th><th className="py-2 pr-4">Health</th></tr>
                  </thead>
                  <tbody>
                    {q.data.recent_runs.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No runs yet this month.</td></tr>
                    )}
                    {q.data.recent_runs.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="py-2 pr-4 text-muted-foreground">{new Date(r.started_at).toLocaleString()}</td>
                        <td className="py-2 pr-4"><StatusPill s={r.status} /></td>
                        <td className="py-2 pr-4 font-mono text-xs">{(r.package_slugs ?? []).join(", ") || "—"}</td>
                        <td className="py-2 pr-4">{r.latency_ms ?? "—"} ms</td>
                        <td className="py-2 pr-4">{r.health ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function QuotaCard({ label, used, limit, hint }: { label: string; used: number; limit: number; hint?: string }) {
  const p = pct(used, limit);
  const danger = p >= 90;
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{used.toLocaleString()} / {limit.toLocaleString()}</div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
        <div
          className={`h-full ${danger ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${p}%` }}
        />
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-500",
    error: "bg-destructive/15 text-destructive",
    blocked: "bg-amber-500/15 text-amber-500",
    running: "bg-primary/15 text-primary",
  };
  return <span className={`rounded px-2 py-0.5 font-mono text-[11px] ${map[s] ?? "bg-muted text-muted-foreground"}`}>{s}</span>;
}
