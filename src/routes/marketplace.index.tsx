import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { TermsStatusBanner } from "@/components/site/TermsStatusBanner";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";
import { BuyButton, PriceBadge } from "@/components/marketplace/BuyButton";
import { Stars } from "@/components/reviews/Stars";
import { ShareOnXButton } from "@/components/share/ShareOnXButton";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — Super Agent Skill" },
      {
        name: "description",
        content:
          "Browse the live registry of skills, playbooks, souls (incl. famous founders & operators) and guardrails. Search by name, person and category.",
      },
      { property: "og:title", content: "Marketplace — Super Agent Skill" },
      { property: "og:description", content: "Live registry of skills, playbooks, souls and guardrails for AI agents." },
      { property: "og:url", content: "https://superagentskill.com/marketplace" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/marketplace" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Super Agent Skill Marketplace",
          description: "Live registry of skills, playbooks, souls and guardrails for AI agents.",
          url: "https://superagentskill.com/marketplace",
        }),
      },
    ],
  }),
  component: Marketplace,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;
type TypeFilter = (typeof TYPES)[number];

const SORTS = [
  { value: "installs_desc", label: "Most installed" },
  { value: "installs_asc", label: "Least installed" },
  { value: "rating_desc", label: "Top rated" },
  { value: "recent", label: "Newest" },
  { value: "name_asc", label: "Name A→Z" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];

const INSTALL_BUCKETS = [
  { value: "any", label: "Any installs", min: 0, max: Infinity },
  { value: "1plus", label: "1+", min: 1, max: Infinity },
  { value: "100plus", label: "100+", min: 100, max: Infinity },
  { value: "1k", label: "1k+", min: 1000, max: Infinity },
  { value: "10k", label: "10k+", min: 10000, max: Infinity },
] as const;
type InstallBucket = (typeof INSTALL_BUCKETS)[number]["value"];

const VERTICAL_GROUPS = [
  { value: "all", label: "All", emoji: "✨", verticals: [] as string[] },
  {
    value: "shop_restaurant",
    label: "Shop & Restaurant",
    emoji: "🛍️",
    verticals: ["retail", "restaurant", "operations", "customer-experience"],
  },
  { value: "data", label: "Data", emoji: "📊", verticals: ["data"] },
  { value: "mobile", label: "Mobile", emoji: "📱", verticals: ["mobile"] },
  {
    value: "creative",
    label: "Creative",
    emoji: "🎨",
    verticals: ["creative", "productivity", "strategy", "career", "marketing"],
  },
] as const;
type VerticalGroupKey = (typeof VERTICAL_GROUPS)[number]["value"];

function Marketplace() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const [type, setType] = useState<TypeFilter>("all");
  const [vertical, setVertical] = useState<string>("all");
  const [verticalGroup, setVerticalGroup] = useState<string>("all");
  const [q, setQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [installBucket, setInstallBucket] = useState<InstallBucket>("any");
  const [sort, setSort] = useState<SortKey>("installs_desc");

  const items = data?.items ?? [];
  const verticals = data?.verticals ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const bucket = INSTALL_BUCKETS.find((b) => b.value === installBucket)!;
    const result = items.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (vertical !== "all" && p.vertical !== vertical) return false;
      if (verticalGroup !== "all") {
        const grp = VERTICAL_GROUPS.find((g) => g.value === verticalGroup);
        if (grp && (!p.vertical || !(grp.verticals as readonly string[]).includes(p.vertical))) return false;
      }
      if (verifiedOnly && !p.author_verified) return false;
      if (p.install_count < bucket.min || p.install_count > bucket.max) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.author_handle.toLowerCase().includes(needle) ||
        (p.vertical?.toLowerCase().includes(needle) ?? false)
      );
    });
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sort) {
        case "installs_desc":
          return b.install_count - a.install_count;
        case "installs_asc":
          return a.install_count - b.install_count;
        case "rating_desc":
          return (b.rating_avg || 0) - (a.rating_avg || 0) || b.rating_count - a.rating_count;
        case "recent":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "name_asc":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return sorted;
  }, [items, type, vertical, verticalGroup, q, verifiedOnly, installBucket, sort]);

  // Counts per type for chips
  const typeCounts = useMemo(() => {
    const base: Record<TypeFilter, number> = {
      all: items.length,
      skill: 0,
      playbook: 0,
      soul: 0,
      guardrail: 0,
    };
    for (const it of items) base[it.type]++;
    return base;
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <TermsStatusBanner className="mb-6" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Registry</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Marketplace</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {data ? `${items.length} live packages` : "Loading registry…"} across the agent stack.
            Search by name, person (e.g. <em>Musk</em>, <em>Buffett</em>) or category.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/marketplace/leaderboard"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
            >
              🏆 Top 50 leaderboard
            </Link>
            <Link
              to="/marketplace/categories"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
            >
              📂 Browse by category
            </Link>
            <Link
              to="/marketplace/rankings"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
            >
              🧑 Humans vs 🤖 Agents
            </Link>
          </div>

          {/* Search + type chips */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, person, slug or category…"
                className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-10 text-sm shadow-sm outline-none focus:border-primary"
              />
              <SearchIcon />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
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
                  <span className="ml-1.5 text-[10px] opacity-70">{typeCounts[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick filters: vertical groups */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Quick filters
            </span>
            {VERTICAL_GROUPS.map((g) => {
              const active = verticalGroup === g.value;
              const count =
                g.value === "all"
                  ? items.length
                  : items.filter(
                      (it) =>
                        it.vertical && (g.verticals as readonly string[]).includes(it.vertical),
                    ).length;
              return (
                <button
                  key={g.value}
                  onClick={() => {
                    setVerticalGroup(g.value);
                    setVertical("all");
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>{g.emoji}</span>
                  <span>{g.label}</span>
                  <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category chips */}
          {verticals.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <CategoryChip
                active={vertical === "all"}
                onClick={() => {
                  setVertical("all");
                  setVerticalGroup("all");
                }}
                label="All"
              />
              {verticals.map((v) => (
                <CategoryChip
                  key={v}
                  active={vertical === v}
                  onClick={() => {
                    setVertical(v);
                    setVerticalGroup("all");
                  }}
                  label={v}
                />
              ))}
            </div>
          )}

          {/* Advanced filters: verified, install range, sort */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span>Verified authors only</span>
            </label>

            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Installs</span>
              <select
                value={installBucket}
                onChange={(e) => setInstallBucket(e.target.value as InstallBucket)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              >
                {INSTALL_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter summary + reset */}
          {(q || type !== "all" || vertical !== "all" || verticalGroup !== "all" || verifiedOnly || installBucket !== "any" || sort !== "installs_desc") && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{filtered.length}</strong> of {items.length}
              </span>
              <button
                onClick={() => {
                  setQ("");
                  setType("all");
                  setVertical("all");
                  setVerticalGroup("all");
                  setVerifiedOnly(false);
                  setInstallBucket("any");
                  setSort("installs_desc");
                }}
                className="text-primary hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading && <SkeletonGrid />}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the registry. Please refresh.
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm font-medium">No packages match your filters.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different search term, or{" "}
              <button
                onClick={() => {
                  setQ("");
                  setType("all");
                  setVertical("all");
                  setVerticalGroup("all");
                }}
                className="text-primary hover:underline"
              >
                reset all filters
              </button>
              .
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Card({ p }: { p: MarketplaceItem }) {
  const linkProps =
    p.type === "soul"
      ? ({ to: "/souls/$slug", params: { slug: p.slug } } as const)
      : ({ to: "/marketplace/$packageId", params: { packageId: p.slug } } as const);
  return (
    <Link
      key={p.id}
      {...linkProps}
      className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={p.type} />
        <div className="flex items-center gap-2">
          <PriceBadge priceCredits={p.price_credits} />
          <span className="font-mono text-[10px] text-muted-foreground">v{p.latest_version}</span>
          <ShareOnXButton
            slug={p.slug}
            type={p.type}
            name={p.name}
            description={p.description}
            url={p.type === "soul" ? `/souls/${p.slug}` : `/marketplace/${p.slug}`}
            variant="icon"
          />
        </div>
      </div>
      <div className="mt-3 font-mono text-[15px] font-semibold leading-tight">{p.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        <AuthorLink handle={p.author_handle} verified={p.author_verified} />
        {p.install_count > 0 && <> · {p.install_count.toLocaleString()} installs</>}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {p.rating_count > 0 ? (
          <>
            <Stars value={p.rating_avg} size={11} />
            <span className="font-mono text-foreground">{p.rating_avg.toFixed(1)}</span>
            <span>({p.rating_count})</span>
            {p.rating_human_count > 0 && <span title="Human ratings">· 🧑 {p.rating_human_count}</span>}
            {p.rating_agent_count > 0 && <span title="Agent ratings">· 🤖 {p.rating_agent_count}</span>}
          </>
        ) : (
          <span>No ratings yet</span>
        )}
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      {p.vertical && (
        <div className="mt-3">
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {p.vertical}
          </span>
        </div>
      )}
      <div className="mt-auto flex items-center gap-2 pt-5">
        <div className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-opacity group-hover:opacity-90">
          {p.price_credits > 0 ? "View →" : "View package →"}
        </div>
        {p.price_credits > 0 && (
          <BuyButton packageId={p.id} priceCredits={p.price_credits} />
        )}
      </div>
    </Link>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-xl border border-border bg-muted/20"
        />
      ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function TypeBadge({ type }: { type: MarketplaceItem["type"] }) {
  const cls =
    type === "skill"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : type === "playbook"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : type === "soul"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {type}
    </span>
  );
}

export function AuthorLink({ handle, verified }: { handle: string; verified?: boolean }) {
  const navigate = useNavigate();
  const slug = handle.replace(/^@/, "");
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate({ to: "/u/$handle", params: { handle: slug } });
      }}
      className="font-medium text-muted-foreground hover:text-primary hover:underline"
    >
      {handle}
      {verified && <span className="ml-1 text-primary">✓</span>}
    </button>
  );
}
