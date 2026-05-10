import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AgentForge" },
      { name: "description", content: "Browse the global registry of skills, playbooks, souls and guardrails for AI agents." },
    ],
  }),
  component: Marketplace,
});

type Pkg = { name: string; type: "skill" | "playbook" | "soul" | "guardrail"; author: string; downloads: string; rating: number; description: string };

const PKGS: Pkg[] = [
  { name: "cardiology-diagnostics", type: "skill", author: "@mayo-health", downloads: "84.2k", rating: 4.9, description: "Differential diagnosis flow trained on 12k cardiology cases." },
  { name: "enterprise-sales-flow", type: "playbook", author: "@oracle-labs", downloads: "212k", rating: 4.8, description: "End-to-end MEDDPICC + multi-thread enterprise sales motion." },
  { name: "steve-jobs-soul", type: "soul", author: "@agentforge", downloads: "1.2M", rating: 4.7, description: "Reality distortion field, taste, brutal product clarity." },
  { name: "medical-guardrails", type: "guardrail", author: "@hippocratic-ai", downloads: "94k", rating: 5.0, description: "FDA-aligned safety boundaries for clinical agent use cases." },
  { name: "growth-hacking-pro", type: "skill", author: "@reforge", downloads: "318k", rating: 4.6, description: "ICE prioritization, north-star metric design, retention loops." },
  { name: "mckinsey-consultant", type: "soul", author: "@strategy-co", downloads: "402k", rating: 4.8, description: "MECE thinking, pyramid principle, executive communication." },
  { name: "legal-due-diligence", type: "skill", author: "@latham", downloads: "47k", rating: 4.9, description: "M&A doc review, red-flag detection, risk memo drafting." },
  { name: "startup-validation-v2", type: "playbook", author: "@yc-tools", downloads: "186k", rating: 4.7, description: "Problem-solution fit, MVP design, customer interview loop." },
  { name: "no-hallucination", type: "guardrail", author: "@agentforge", downloads: "1.8M", rating: 4.9, description: "Citation enforcement and uncertainty acknowledgement." },
];

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;

function Marketplace() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("all");
  const [q, setQ] = useState("");
  const filtered = PKGS.filter((p) => (filter === "all" || p.type === filter) && p.name.includes(q.toLowerCase()));

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
            <div key={p.name} className="group rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                  p.type === "skill" ? "border-blue-500/30 bg-blue-500/10 text-blue-600" :
                  p.type === "playbook" ? "border-amber-500/30 bg-amber-500/10 text-amber-700" :
                  p.type === "soul" ? "border-violet-500/30 bg-violet-500/10 text-violet-600" :
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}>{p.type}</span>
                <span className="font-mono text-xs text-muted-foreground">★ {p.rating}</span>
              </div>
              <div className="mt-3 font-mono text-[15px] font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.author} · {p.downloads} installs</div>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              <button className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90">
                Install
              </button>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
