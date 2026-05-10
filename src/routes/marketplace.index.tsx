import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — Super Agent Skill" },
      {
        name: "description",
        content:
          "Browse the live registry of skills, playbooks, souls (incl. famous founders & operators) and guardrails. Search by name, person and category.",
      },
    ],
  }),
  component: Marketplace,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;
type TypeFilter = (typeof TYPES)[number];

function Marketplace() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const [type, setType] = useState<TypeFilter>("all");
  const [vertical, setVertical] = useState<string>("all");
  const [q, setQ] = useState("");

  const items = data?.items ?? [];
  const verticals = data?.verticals ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (vertical !== "all" && p.vertical !== vertical) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.author_handle.toLowerCase().includes(needle) ||
        (p.vertical?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [items, type, vertical, q]);

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
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Registry</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Marketplace</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {data ? `${items.length} live packages` : "Loading registry…"} across the agent stack.
            Search by name, person (e.g. <em>Musk</em>, <em>Buffett</em>) or category.
          </p>

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

          {/* Category chips */}
          {verticals.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <CategoryChip
                active={vertical === "all"}
                onClick={() => setVertical("all")}
                label="All"
              />
              {verticals.map((v) => (
                <CategoryChip
                  key={v}
                  active={vertical === v}
                  onClick={() => setVertical(v)}
                  label={v}
                />
              ))}
            </div>
          )}

          {/* Active filter summary + reset */}
          {(q || type !== "all" || vertical !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{filtered.length}</strong> of {items.length}
              </span>
              <button
                onClick={() => {
                  setQ("");
                  setType("all");
                  setVertical("all");
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
        <span className="font-mono text-[10px] text-muted-foreground">v{p.latest_version}</span>
      </div>
      <div className="mt-3 font-mono text-[15px] font-semibold leading-tight">{p.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {p.author_handle}
        {p.author_verified && <span className="ml-1 text-primary">✓</span>}
        {p.install_count > 0 && <> · {p.install_count.toLocaleString()} installs</>}
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      {p.vertical && (
        <div className="mt-3">
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {p.vertical}
          </span>
        </div>
      )}
      <div className="mt-auto pt-5">
        <div className="inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-opacity group-hover:opacity-90">
          View package →
        </div>
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
