import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";
import { PACKAGES, type PackageType } from "@/data/packages";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — AgentForge" },
      { name: "description", content: "Browse the global registry of skills, playbooks, souls and guardrails for AI agents." },
    ],
  }),
  component: Marketplace,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;

function Marketplace() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("all");
  const [q, setQ] = useState("");
  const filtered = PACKAGES.filter(
    (p) => (filter === "all" || p.type === filter) && p.name.includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Registry</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Marketplace</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            4,218 packages across the agent stack. Discoverable through MCP, installable with one command.
          </p>
          <div className="mt-8 flex flex-col gap-3 md:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search packages…"
              className="h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm shadow-sm outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                    filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/marketplace/$packageId"
              params={{ packageId: p.id }}
              className="group rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <TypeBadge type={p.type} />
                <span className="font-mono text-xs text-muted-foreground">★ {p.rating}</span>
              </div>
              <div className="mt-3 font-mono text-[15px] font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.author} · {p.downloads} installs
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-opacity group-hover:opacity-90">
                View package →
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

export function TypeBadge({ type }: { type: PackageType }) {
  const cls =
    type === "skill"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
      : type === "playbook"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
        : type === "soul"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-600"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {type}
    </span>
  );
}
