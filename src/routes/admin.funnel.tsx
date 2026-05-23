import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SitePage } from "@/components/site/SitePage";
import { getMcpFunnelSummary } from "@/lib/admin/funnel.functions";

export const Route = createFileRoute("/admin/funnel")({
  head: () => ({
    meta: [
      { title: "MCP funnel — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFunnelPage,
});

// Ordered logically — top of funnel → bottom. Events not in this list
// still get rendered (sorted to the end) so a new event we forget to
// add to the order doesn't silently disappear.
const EVENT_ORDER = [
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
  const fn = useServerFn(getMcpFunnelSummary);
  const [days, setDays] = useState(7);
  const q = useQuery({
    queryKey: ["admin", "mcp-funnel", days],
    queryFn: () => fn({ data: { days } }),
  });

  const top = q.data?.events.find((e) => e.event === "connect_viewed")?.count ?? 0;
  function rate(c: number): string {
    if (!top) return "—";
    return `${((c / top) * 100).toFixed(1)}%`;
  }

  const ordered = (q.data?.events ?? []).slice().sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event);
    const bi = EVENT_ORDER.indexOf(b.event);
    if (ai === -1 && bi === -1) return b.count - a.count;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <SitePage>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">MCP funnel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect-flow telemetry over the last {days} days. Rates are calculated against{" "}
          <code className="font-mono text-xs">connect_viewed</code> (top of funnel).
        </p>

        <div className="mt-6 flex gap-2">
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

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
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
                <tr>
                  <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              )}
              {q.isError && (
                <tr>
                  <td className="px-4 py-3 text-destructive" colSpan={4}>
                    Forbidden. Admin role required.
                  </td>
                </tr>
              )}
              {ordered.map((e) => (
                <tr key={e.event} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    <div className="font-medium">{EVENT_LABEL[e.event] ?? e.event}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{e.event}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{e.count}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.distinct_users}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {rate(e.count)}
                  </td>
                </tr>
              ))}
              {q.data && ordered.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                    No events in this window yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </SitePage>
  );
}
