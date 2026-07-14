import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SitePage } from "@/components/site/SitePage";
import {
  getMcpFunnelSummary,
  getMcpFunnelTrafficBreakdown,
  getMcpFunnelUaFamilies,
} from "@/lib/admin/funnel.functions";

export const Route = createFileRoute("/admin/funnel")({
  head: () => ({
    meta: [{ title: "MCP funnel — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminFunnelPage,
});

const EVENT_ORDER = [
  "hero_viewed",
  "cta_clicked",
  "signup_viewed",
  "signup_started",
  "signup_completed",
  "signup_failed",
  "connect_viewed",
  "install_button_clicked",
  "oauth_authorize_viewed",
  "oauth_authorize_approved",
  "oauth_authorize_denied",
  "oauth_success_shown",
  "oauth_loopback_attempted",
  "oauth_scheme_triggered",
  "oauth_manual_code_copied",
  "mcp_first_call",
  "mcp_first_write",
  "pat_minted",
];

const EVENT_LABEL: Record<string, string> = {
  hero_viewed: "Landing hero viewed",
  cta_clicked: "Landing CTA clicked",
  signup_viewed: "Signup page viewed",
  signup_started: "Signup submitted",
  signup_completed: "Signup completed",
  signup_failed: "Signup failed",
  connect_viewed: "Viewed /connect",
  install_button_clicked: "Clicked install button",
  oauth_authorize_viewed: "Saw consent screen",
  oauth_authorize_approved: "Clicked Authorize",
  oauth_authorize_denied: "Clicked Deny",
  oauth_success_shown: "Saw success screen",
  oauth_loopback_attempted: "Loopback delivery attempted",
  oauth_scheme_triggered: "Deep-link triggered",
  oauth_manual_code_copied: "Copied manual code",
  mcp_first_call: "First tools/call",
  mcp_first_write: "First write tool",
  pat_minted: "Minted a PAT",
};

function AdminFunnelPage() {
  const fnSummary = useServerFn(getMcpFunnelSummary);
  const fnBreak = useServerFn(getMcpFunnelTrafficBreakdown);
  const fnUa = useServerFn(getMcpFunnelUaFamilies);
  const [days, setDays] = useState(7);
  const [excludeBots, setExcludeBots] = useState(true);

  const q = useQuery({
    queryKey: ["admin", "mcp-funnel", days, excludeBots],
    queryFn: () => fnSummary({ data: { days, exclude_bots: excludeBots } }),
  });
  const bk = useQuery({
    queryKey: ["admin", "mcp-funnel-breakdown", days],
    queryFn: () => fnBreak({ data: { days } }),
  });
  const ua = useQuery({
    queryKey: ["admin", "mcp-funnel-ua", days],
    queryFn: () => fnUa({ data: { days, limit: 20 } }),
  });

  const top = q.data?.events.find((e) => e.event === "hero_viewed" || e.event === "connect_viewed")?.count ?? 0;
  const rate = (c: number): string => (top ? `${((c / top) * 100).toFixed(1)}%` : "—");

  const ordered = (q.data?.events ?? []).slice().sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event);
    const bi = EVENT_ORDER.indexOf(b.event);
    if (ai === -1 && bi === -1) return b.count - a.count;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const totals = (bk.data?.rows ?? []).reduce(
    (acc, r) => {
      acc.human += Number(r.human_count) || 0;
      acc.bot += Number(r.bot_count) || 0;
      return acc;
    },
    { human: 0, bot: 0 },
  );
  const totalAll = totals.human + totals.bot;
  const humanPct = totalAll ? ((totals.human / totalAll) * 100).toFixed(1) : "0.0";

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Funnel & traffic</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last {days} days. Events are tagged as bot/human server-side from the User-Agent —
          bots include search crawlers, uptime probes, scanners, headless browsers, HTTP libs
          and unknown UAs. Raw events are always kept; reports subtract bots by default.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[1, 7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  days === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                Last {d}d
              </button>
            ))}
          </div>
          <label className="ml-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
            <input
              type="checkbox"
              checked={excludeBots}
              onChange={(e) => setExcludeBots(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Humans only (exclude bots)
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Human events" value={totals.human.toLocaleString()} tone="pos" />
          <StatCard label="Bot events" value={totals.bot.toLocaleString()} tone="warn" />
          <StatCard label="Human share" value={`${humanPct}%`} />
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">
          Funnel {excludeBots ? "(humans only)" : "(all traffic)"}
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Step</th>
                <th className="px-4 py-2 text-right font-medium">Count</th>
                <th className="px-4 py-2 text-right font-medium">Distinct</th>
                <th className="px-4 py-2 text-right font-medium">% of top</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td className="px-4 py-3 text-muted-foreground" colSpan={4}>Loading…</td></tr>
              )}
              {q.isError && (
                <tr><td className="px-4 py-3 text-destructive" colSpan={4}>Forbidden. Admin role required.</td></tr>
              )}
              {ordered.map((e) => (
                <tr key={e.event} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    <div className="font-medium">{EVENT_LABEL[e.event] ?? e.event}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{e.event}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{e.count}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.distinct_users}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{rate(e.count)}</td>
                </tr>
              ))}
              {q.data && ordered.length === 0 && (
                <tr><td className="px-4 py-3 text-muted-foreground" colSpan={4}>No events in this window yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Human vs bot per event</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 text-right font-medium">Humans</th>
                <th className="px-4 py-2 text-right font-medium">Bots</th>
                <th className="px-4 py-2 text-right font-medium">Human %</th>
              </tr>
            </thead>
            <tbody>
              {(bk.data?.rows ?? []).map((r) => {
                const total = Number(r.human_count) + Number(r.bot_count);
                const pct = total ? ((Number(r.human_count) / total) * 100).toFixed(0) : "—";
                return (
                  <tr key={r.event} className="border-t border-border/60">
                    <td className="px-4 py-2">
                      <div className="font-medium">{EVENT_LABEL[r.event] ?? r.event}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.event}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{Number(r.human_count).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono text-amber-500">{Number(r.bot_count).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{typeof pct === "string" ? pct + (pct === "—" ? "" : "%") : pct}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Top User-Agent families</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Family</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Events</th>
              </tr>
            </thead>
            <tbody>
              {(ua.data?.rows ?? []).map((r) => (
                <tr key={r.ua_family + String(r.is_bot)} className="border-t border-border/60">
                  <td className="px-4 py-2 font-mono">{r.ua_family}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                        r.is_bot
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-emerald-500/15 text-emerald-500"
                      }`}
                    >
                      {r.is_bot ? "bot" : "human"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{Number(r.count).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </SitePage>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "warn";
}) {
  const color =
    tone === "pos" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
