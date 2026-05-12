import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { getMyReferralStats } from "@/lib/referrals/referrals.functions";

export const Route = createFileRoute("/account/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — Super Agent Skill" },
      { name: "description", content: "Invite others and earn credits whenever they subscribe or buy on the marketplace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchStats = useServerFn(getMyReferralStats);
  const { data, isLoading } = useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => fetchStats(),
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/account/referrals" } });
  }, [loading, user, navigate]);

  const code = data?.referral_code ?? "";
  const link = code ? `https://www.superagentskill.com/?ref=${code}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Grow & earn</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Referrals</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Share Super Agent Skill with anyone — when they sign up, subscribe, or buy a package
            through your link, you earn credits you can spend on the marketplace.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Your referral link</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
              {isLoading ? "Loading…" : link || "—"}
            </code>
            <button
              type="button"
              onClick={copy}
              disabled={!link}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              Copy link
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Code: <span className="font-mono text-foreground">{code || "—"}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat label="Clicks" value={(data?.clicks ?? 0).toLocaleString()} />
          <Stat label="Sign-ups" value={(data?.signups ?? 0).toLocaleString()} />
          <Stat label="Subscribed" value={(data?.subscribed ?? 0).toLocaleString()} />
          <Stat label="Credits earned" value={`+${(data?.credits_earned ?? 0).toLocaleString()}`} accent />
        </div>

        <div className="mt-8 rounded-xl border border-border bg-background p-5">
          <div className="text-sm font-semibold">How rewards work</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">→</span><span>Someone signs up via your link: <span className="text-foreground">+20 credits</span> (and they get +50 to start).</span></li>
            <li className="flex gap-2"><span className="text-primary">→</span><span>They become a paid subscriber: <span className="text-foreground">+200 credits</span>.</span></li>
            <li className="flex gap-2"><span className="text-primary">→</span><span>Every package they buy: <span className="text-foreground">5% commission</span> back to you in credits.</span></li>
            <li className="flex gap-2"><span className="text-primary">→</span><span>Monthly cap: 5,000 credits per referrer. Self-referrals don't count.</span></li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/marketplace" className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-accent">Open marketplace</Link>
            <Link to="/account/credits" className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-accent">View credits ledger</Link>
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
