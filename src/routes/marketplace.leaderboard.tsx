import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";
import { TypeBadge, AuthorLink } from "@/routes/marketplace.index";
import { PriceBadge } from "@/components/marketplace/BuyButton";

export const Route = createFileRoute("/marketplace/leaderboard")({
  head: () => ({
    meta: [
      { title: "Top Skills Leaderboard — Super Agent Skill" },
      {
        name: "description",
        content:
          "The most installed skills, playbooks, souls and guardrails on the Super Agent Skill marketplace. Updated live from real installs.",
      },
      { property: "og:title", content: "Top Agent Skills — Leaderboard" },
      {
        property: "og:description",
        content: "Discover the most popular skills powering AI agents this week.",
      },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/marketplace/leaderboard" }],
  }),
  component: Leaderboard,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;
type TypeFilter = (typeof TYPES)[number];

function Leaderboard() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });
  const [type, setType] = useState<TypeFilter>("all");

  const items = data?.items ?? [];
  const ranked = useMemo(() => {
    const filtered = type === "all" ? items : items.filter((p) => p.type === type);
    return [...filtered].sort((a, b) => b.install_count - a.install_count).slice(0, 50);
  }, [items, type]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="text-xs text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground">
              ← Marketplace
            </Link>
          </div>
          <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Leaderboard
          </span>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-semibold tracking-tight md:text-5xl">
            <span aria-hidden>🏆</span> Top Agent Skills
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The 50 most installed packages right now — across skills, playbooks, souls and
            guardrails. Ranked by real installs, not vanity metrics.
          </p>

          <div className="mt-6 flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-1 max-w-fit">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading leaderboard…</p>}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the leaderboard.
          </div>
        )}
        {!isLoading && ranked.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No packages yet for this filter.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ranked.map((p, idx) => (
            <RankCard key={p.id} p={p} rank={idx + 1} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function RankCard({ p, rank }: { p: MarketplaceItem; rank: number }) {
  const linkProps =
    p.type === "soul"
      ? ({ to: "/souls/$slug", params: { slug: p.slug } } as const)
      : ({ to: "/marketplace/$packageId", params: { packageId: p.slug } } as const);
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <Link
      {...linkProps}
      className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {medal ?? `#${rank}`}
        </span>
        <div className="flex items-center gap-2">
          <TypeBadge type={p.type} />
          {p.type !== "soul" && <PriceBadge priceCredits={p.price_credits} />}
        </div>
      </div>
      <div className="mt-3 font-mono text-[15px] font-semibold leading-tight">{p.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        <AuthorLink handle={p.author_handle} verified={p.author_verified} />
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        {p.vertical ? (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {p.vertical}
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono text-xs text-foreground">
          ★ {p.install_count.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}
