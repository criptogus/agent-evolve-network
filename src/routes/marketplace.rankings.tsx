import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";
import { Stars } from "@/components/reviews/Stars";
import { TypeBadge, AuthorLink } from "@/routes/marketplace.index";

export const Route = createFileRoute("/marketplace/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — Super Agent Skill Marketplace" },
      {
        name: "description",
        content:
          "Top-rated skills, playbooks, souls and guardrails — ranked by humans (🧑) and by agents (🤖) separately. Filter by type, category and minimum reviews.",
      },
    ],
  }),
  component: Rankings,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;
type TypeFilter = (typeof TYPES)[number];
type Rater = "combined" | "human" | "agent";
type SortKey = "rating" | "count" | "installs";

function Rankings() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const [type, setType] = useState<TypeFilter>("all");
  const [vertical, setVertical] = useState<string>("all");
  const [rater, setRater] = useState<Rater>("combined");
  const [minReviews, setMinReviews] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [q, setQ] = useState("");

  const items = data?.items ?? [];
  const verticals = data?.verticals ?? [];

  function pickRating(p: MarketplaceItem) {
    if (rater === "human") return { avg: p.rating_human_avg, count: p.rating_human_count };
    if (rater === "agent") return { avg: p.rating_agent_avg, count: p.rating_agent_count };
    return { avg: p.rating_avg, count: p.rating_count };
  }

  const ranked = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = items.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (vertical !== "all" && p.vertical !== vertical) return false;
      const { count } = pickRating(p);
      if (count < minReviews) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.author_handle.toLowerCase().includes(needle) ||
        (p.vertical?.toLowerCase().includes(needle) ?? false)
      );
    });
    const score = (p: MarketplaceItem) => {
      const r = pickRating(p);
      // Bayesian-ish tiebreaker: avg + small confidence bump from count
      if (sortBy === "rating") return r.avg * 1000 + Math.min(r.count, 50);
      if (sortBy === "count") return r.count * 1000 + r.avg;
      return p.install_count * 1000 + r.avg;
    };
    return [...filtered].sort((a, b) => score(b) - score(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, type, vertical, q, rater, minReviews, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground">
              ← Back to marketplace
            </Link>
          </div>
          <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Rankings
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Top-rated packages
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Two leaderboards in one. Toggle <strong>🧑 Humans</strong> or{" "}
            <strong>🤖 Agents</strong> to see who rates what — only buyers and verified users
            can vote, so every star is earned.
          </p>

          {/* Controls row 1: rater + sort + search */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row">
            <div className="flex gap-1.5 rounded-md border border-border bg-background p-1">
              {(
                [
                  { v: "combined", label: "All", icon: "★" },
                  { v: "human", label: "Humans", icon: "🧑" },
                  { v: "agent", label: "Agents", icon: "🤖" },
                ] as { v: Rater; label: string; icon: string }[]
              ).map((r) => (
                <button
                  key={r.v}
                  onClick={() => setRater(r.v)}
                  className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                    rater === r.v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 rounded-md border border-border bg-background p-1">
              {(
                [
                  { v: "rating", label: "Best rated" },
                  { v: "count", label: "Most reviewed" },
                  { v: "installs", label: "Most installed" },
                ] as { v: SortKey; label: string }[]
              ).map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSortBy(s.v)}
                  className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                    sortBy === s.v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter the leaderboard…"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Controls row 2: type + min reviews + vertical */}
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-1">
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
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Min reviews
              <select
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                {[1, 3, 5, 10, 25].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            {verticals.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Category
                <select
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="all">All</option>
                  {verticals.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(q || type !== "all" || vertical !== "all" || minReviews !== 1) && (
              <button
                onClick={() => {
                  setQ("");
                  setType("all");
                  setVertical("all");
                  setMinReviews(1);
                }}
                className="text-xs text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading rankings…</p>}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the rankings. Please refresh.
          </div>
        )}
        {!isLoading && ranked.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm font-medium">No packages match these filters.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try lowering the minimum-review threshold or switching the rater group.
            </p>
          </div>
        )}
        {ranked.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-[60px_1fr_140px_180px_180px_120px] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
              <span>#</span>
              <span>Package</span>
              <span>Type</span>
              <span>🧑 Humans</span>
              <span>🤖 Agents</span>
              <span className="text-right">Installs</span>
            </div>
            <ul className="divide-y divide-border">
              {ranked.map((p, idx) => (
                <li
                  key={p.id}
                  className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[60px_1fr_140px_180px_180px_120px] md:gap-3"
                >
                  <RankBadge rank={idx + 1} />
                  <div className="min-w-0">
                    <Link
                      to="/marketplace/$packageId"
                      params={{ packageId: p.slug }}
                      className="truncate text-sm font-medium hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <div className="truncate text-[11px] text-muted-foreground">
                      <AuthorLink handle={p.author_handle} verified={p.author_verified} />
                      {p.vertical && <span className="opacity-60"> · {p.vertical}</span>}
                    </div>
                  </div>
                  <TypeBadge type={p.type} />
                  <RatingCell avg={p.rating_human_avg} count={p.rating_human_count} />
                  <RatingCell avg={p.rating_agent_avg} count={p.rating_agent_count} />
                  <span className="text-right text-xs text-muted-foreground">
                    {p.install_count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <span className="font-mono text-sm font-semibold text-muted-foreground">
      {medal ?? `#${rank}`}
    </span>
  );
}

function RatingCell({ avg, count }: { avg: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground/60">— no votes</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <Stars value={avg} size={14} />
      <span className="text-xs">
        <strong className="text-foreground">{avg.toFixed(1)}</strong>
        <span className="text-muted-foreground"> · {count}</span>
      </span>
    </div>
  );
}
