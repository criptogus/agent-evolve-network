import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SitePage } from "@/components/site/SitePage";
import { getMyEarnings, type EarningsSummary } from "@/lib/earnings/earnings.functions";

export const Route = createFileRoute("/account/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — Super Agent Skill" },
      {
        name: "description",
        content: "Track sales, tips, lineage cuts, and payout history for your published packages.",
      },
    ],
  }),
  component: AccountEarningsPage,
});

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const KIND_LABEL: Record<string, string> = {
  author: "Author share",
  referral: "Referral cut",
  lineage: "Lineage cut",
  platform: "Platform",
};

function AccountEarningsPage() {
  const fetchEarnings = useServerFn(getMyEarnings);
  const q = useQuery({
    queryKey: ["account", "earnings"],
    queryFn: () => fetchEarnings() as Promise<EarningsSummary>,
  });

  const d = q.data;

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Earnings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Everything you've earned from your published packages: marketplace sales (credits), tips,
          and revenue-share payouts including lineage and referral cuts.
        </p>

        {q.isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading…</div>}
        {q.isError && (
          <div className="mt-8 text-sm">
            <span className="text-destructive">Sign in to see your earnings.</span>{" "}
            <Link to="/login" className="text-primary">Sign in →</Link>
          </div>
        )}

        {d && !d.has_any && (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No earnings yet — publish a package to start earning 80–85% of every sale.
            </p>
            <Link
              to="/account/packages"
              className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
            >
              Go to my packages →
            </Link>
          </div>
        )}

        {d && d.has_any && (
          <>
            {/* Totals */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Sale earnings" value={`${d.total_sale_credits.toLocaleString()} cr`} />
              <StatTile label="Purchases" value={d.total_purchases.toLocaleString()} />
              <StatTile label="Tips" value={usd(d.total_tips_cents)} />
              <StatTile label="Revenue-share payouts" value={usd(d.total_payout_cents)} />
            </div>

            {/* Per-package breakdown */}
            <div className="mt-8 rounded-2xl border border-border bg-surface">
              <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Per-package breakdown
              </div>
              {d.packages.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No per-package activity yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-2">Package</th>
                        <th className="px-3 py-2 text-right">Purchases</th>
                        <th className="px-3 py-2 text-right">Your credits</th>
                        <th className="px-3 py-2 text-right">Tips</th>
                        <th className="px-3 py-2 text-right">Lineage cuts</th>
                        <th className="px-5 py-2 text-right">Payouts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {d.packages.map((p) => (
                        <tr key={p.package_id}>
                          <td className="px-5 py-3">
                            <span className="font-medium">{p.name ?? p.slug ?? p.package_id}</span>
                            {p.slug && (
                              <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">{p.purchases}</td>
                          <td className="px-3 py-3 text-right">
                            {p.author_credits.toLocaleString()} cr
                            {p.gross_credits > 0 && (
                              <div className="text-xs text-muted-foreground">
                                of {p.gross_credits.toLocaleString()} gross
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {p.tips_cents > 0 ? `${usd(p.tips_cents)} (${p.tips_count})` : "—"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {p.lineage_cents > 0 ? usd(p.lineage_cents) : "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {p.payout_cents > 0 ? usd(p.payout_cents) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout history */}
            <div className="mt-8 rounded-2xl border border-border bg-surface">
              <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Payout history
              </div>
              {d.payouts.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  No revenue-share payouts recorded yet.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {d.payouts.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{KIND_LABEL[r.kind] ?? r.kind}</span>
                        {r.package_name && (
                          <span className="text-muted-foreground"> · {r.package_name}</span>
                        )}
                        {r.notes && (
                          <div className="text-xs text-muted-foreground">{r.notes}</div>
                        )}
                        <div className="font-mono text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono">{usd(r.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Sale earnings are credited to your credit balance automatically — see{" "}
              <Link to="/account/credits" className="text-primary hover:underline">Credits</Link>.
              Tips and revenue-share payouts are settled in USD via your payment provider.
            </p>
          </>
        )}
      </main>
    </SitePage>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
