import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";

export const Route = createFileRoute("/marketplace/categories")({
  head: () => ({
    meta: [
      { title: "Browse by Category — Super Agent Skill Marketplace" },
      {
        name: "description",
        content:
          "Explore agent skills by category: Security, API Development, DevOps, Productivity, Collaboration, Database and more.",
      },
      { property: "og:title", content: "Browse Agent Skills by Category" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/marketplace/categories" }],
  }),
  component: Categories,
});

function Categories() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, MarketplaceItem[]>();
    for (const it of items) {
      const key = it.vertical || "Uncategorized";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([name, arr]) => ({
        name,
        items: arr.sort((a, b) => b.install_count - a.install_count),
        installs: arr.reduce((s, p) => s + p.install_count, 0),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [data]);

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
            Categories
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Browse by category
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Find the right skill faster — grouped by vertical and sorted by install volume.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && grouped.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map((g) => (
            <div
              key={g.name}
              className="flex flex-col rounded-xl border border-border bg-background p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold capitalize">{g.name}</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? "skill" : "skills"}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {g.items.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/marketplace/$packageId"
                      params={{ packageId: p.slug }}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/40"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ★ {p.install_count.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {g.items.length > 5 && (
                <Link
                  to="/marketplace"
                  search={{ vertical: g.name } as never}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  View all {g.items.length} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
