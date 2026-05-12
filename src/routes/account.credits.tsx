import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { getCreditSummary, type LedgerEntry } from "@/lib/credits/credits.functions";

export const Route = createFileRoute("/account/credits")({
  head: () => ({
    meta: [
      { title: "Credits — Super Agent Skill" },
      {
        name: "description",
        content:
          "Your credit balance, transparent ledger of every spend and earning, and how the Super Agent Skill economy works.",
      },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getCreditSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["credits-summary"],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/account/credits" } });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Economy</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Credits</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Credits power everything: creating, improving and buying packages. Authors earn credits
            on every sale. Below is your transparent, append-only ledger.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Current balance" value={isLoading ? "…" : (data?.balance ?? 0).toLocaleString()} accent />
          <Stat label="Total earned" value={isLoading ? "…" : `+${(data?.total_earned ?? 0).toLocaleString()}`} />
          <Stat label="Total spent" value={isLoading ? "…" : `−${(data?.total_spent ?? 0).toLocaleString()}`} />
        </div>

        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Earn credits by sharing</div>
              <div className="text-xs text-muted-foreground">Invite others and earn up to 200 credits per new subscriber + 5% on their purchases.</div>
            </div>
            <Link to="/account/referrals" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">
              Get my referral link →
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <InfoCard title="How you earn" items={[
            "Sign-up bonus (one-time): +100 credits",
            "Monthly subscription grant on Pro / Enterprise",
            "Sales of your packages: 70% of price goes to you",
            "Referral bonuses: +20 signup, +200 subscriber, 5% on buys",
          ]} />
          <InfoCard title="What you spend on" items={[
            "Buying paid packages from the marketplace",
            "Forge runs: authoring, evaluating and auto-learn",
            "On-demand creation when a primitive is missing",
          ]} />
        </div>

        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link to="/marketplace" className="text-sm text-primary hover:underline">
              Spend on marketplace →
            </Link>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Δ</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && (data?.recent ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No activity yet. Your sign-up bonus appears as soon as you complete onboarding.
                  </td></tr>
                )}
                {(data?.recent ?? []).map((e) => <Row key={e.id} e={e} />)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 font-mono text-3xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><span className="text-primary">·</span><span>{i}</span></li>
        ))}
      </ul>
    </div>
  );
}

function Row({ e }: { e: LedgerEntry }) {
  const positive = e.delta > 0;
  return (
    <tr className="border-t border-border">
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
        {new Date(e.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-2.5">
        <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {e.reason.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{e.description ?? "—"}</td>
      <td className={`px-4 py-2.5 text-right font-mono ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {positive ? "+" : ""}{e.delta.toLocaleString()}
      </td>
      <td className="px-4 py-2.5 text-right font-mono">{e.balance_after.toLocaleString()}</td>
    </tr>
  );
}
