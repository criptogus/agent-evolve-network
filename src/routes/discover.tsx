import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { autoCreateMissing } from "@/lib/skills/forge-loop.functions";
import { supabase } from "@/integrations/supabase/client";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  // Always re-fetch from the database — no SWR cache, no stale data.
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  loader: async () => {
    const { items } = await listMarketplace();
    return { items: items as MarketplaceItem[], fetchedAt: Date.now() };
  },
  head: () => ({
    meta: [
      { title: "Discover · Super Agent Skill" },
      {
        name: "description",
        content:
          "Search skills, playbooks, souls and guardrails. Customize each one to your industry, style and priorities — via chat or MCP.",
      },
    ],
  }),
});

type Type = "skill" | "playbook" | "soul" | "guardrail";

interface Item {
  id: string;
  name: string;
  type: Type;
  category: string;
  tags: string[];
  description: string;
  popularity: number;
  author: string;
}

// Items now come from the database via the route loader. The static demo array
// has been removed in favour of `useLoaderData()` + a DB→Item adapter below.


const TYPE_META: Record<Type, { label: string; plural: string; tone: string }> = {
  skill: { label: "Skill", plural: "Skills", tone: "skill" },
  playbook: { label: "Playbook", plural: "Playbooks", tone: "playbook" },
  soul: { label: "Soul", plural: "Souls", tone: "soul" },
  guardrail: { label: "Guardrail", plural: "Guardrails", tone: "guardrail" },
};

const INDUSTRIES = [
  "Healthcare",
  "Legal",
  "B2B SaaS",
  "Fintech",
  "E-commerce",
  "Education",
  "Logistics",
  "Real estate",
  "Media & Creator",
];

const STYLES = ["Concise & direct", "Warm & empathetic", "Executive / boardroom", "Playful & punchy", "Technical & precise"];

const GOVERNANCE_LEVELS = [
  { key: "L1", label: "L1 · Observability", body: "Logs decisions and outputs. No blocking." },
  { key: "L2", label: "L2 · Soft warnings", body: "Flags risky outputs. User confirms to proceed." },
  { key: "L3", label: "L3 · Hard block", body: "Blocks unsafe actions. Escalates to a human." },
  { key: "L4", label: "L4 · Sandboxed", body: "Read-only mode. No writes, no external calls." },
];

function dbToItem(p: MarketplaceItem): Item {
  const vertical = p.vertical || "General";
  const category = vertical
    .split(/[-_/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const tags = Array.from(
    new Set(
      [
        vertical.toLowerCase(),
        ...p.name.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 2),
      ].slice(0, 5)
    )
  );
  return {
    id: p.slug,
    name: p.slug,
    type: (p.type as Type) ?? "skill",
    category,
    tags,
    description: p.description,
    popularity: p.install_count ?? 0,
    author: p.author_handle,
  };
}

function DiscoverPage() {
  const { items: dbItems, fetchedAt } = Route.useLoaderData();
  const router = useRouter();
  const ITEMS: Item[] = useMemo(() => dbItems.map(dbToItem), [dbItems]);

  // Live counts per type from the freshest loader payload.
  const countsByType = useMemo(() => {
    const acc: Record<Type, number> = { skill: 0, playbook: 0, soul: 0, guardrail: 0 };
    for (const i of ITEMS) acc[i.type] = (acc[i.type] ?? 0) + 1;
    return acc;
  }, [ITEMS]);

  // Revalidate the loader on tab focus and every 30s while visible.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === "visible") router.invalidate();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    const id = window.setInterval(refetch, 30_000);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
      window.clearInterval(id);
    };
  }, [router]);

  const [type, setType] = useState<Type>("skill");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<Item | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const autoCreateFn = useServerFn(autoCreateMissing);
  const autoCreateM = useMutation({
    mutationFn: (input: { brief: string; type: Type }) =>
      autoCreateFn({ data: { brief: input.brief, type: input.type } }),
  });

  const requestAutoCreate = async (brief: string) => {
    setAuthMessage(null);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setAuthMessage("Sign in to auto-create — we research the state of the art and ship a beta.");
      return;
    }
    autoCreateM.mutate({ brief, type });
  };

  const itemsOfType = useMemo(() => ITEMS.filter((i) => i.type === type), [ITEMS, type]);


  const categories = useMemo(() => {
    const set = new Set<string>();
    itemsOfType.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [itemsOfType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return itemsOfType.filter((i) => {
      if (category && i.category !== category) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q)) ||
        i.category.toLowerCase().includes(q)
      );
    });
  }, [itemsOfType, query, category]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        {/* Header */}
        <div className="border-b border-border/70 pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Live · {ITEMS.length} packages ·{" "}
              {countsByType.skill}&nbsp;skills · {countsByType.playbook}&nbsp;playbooks ·{" "}
              {countsByType.soul}&nbsp;souls · {countsByType.guardrail}&nbsp;guardrails
            </span>
            <button
              onClick={() => router.invalidate()}
              title={`Updated ${new Date(fetchedAt).toLocaleTimeString()}`}
              className="ml-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              ↻ refresh
            </button>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Find any capability. Make it yours.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Search the registry for skills, playbooks, souls and guardrails. Customize each one to
            your industry, style and priorities — by chat, or as a single MCP command.
          </p>
        </div>

        {/* Search + tabs */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${TYPE_META[type].plural.toLowerCase()} — e.g. "linkedin", "google ads", "medical"…`}
              className="h-11 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex h-11 items-center rounded-md border border-border bg-surface p-0.5">
            {(Object.keys(TYPE_META) as Type[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setCategory(null);
                }}
                className={
                  "h-10 rounded-[5px] px-3 text-sm font-medium transition-colors " +
                  (type === t
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {TYPE_META[t].plural}
                <span className="ml-1.5 rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                  {countsByType[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Facets */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              <FacetGroup
                label={type === "guardrail" ? "Domain" : "Category"}
                options={categories}
                value={category}
                onChange={setCategory}
                count={(c) => itemsOfType.filter((i) => i.category === c).length}
                allCount={itemsOfType.length}
              />

              <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
                <div className="mb-1 font-mono uppercase tracking-wider text-foreground">
                  Tip
                </div>
                Don't see what you need? Type the gap into the customize panel — SkillForge will
                generate a brand-new {TYPE_META[type].label.toLowerCase()} for you.
              </div>
            </div>
          </aside>

          {/* Results */}
          <section>
            <div className="mb-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {filtered.length} {TYPE_META[type].plural.toLowerCase()}{" "}
                {category && (
                  <>
                    in <span className="text-foreground">{category}</span>
                    <button
                      onClick={() => setCategory(null)}
                      className="ml-2 text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      clear
                    </button>
                  </>
                )}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Sorted by popularity
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                type={type}
                query={query}
                isPending={autoCreateM.isPending}
                result={autoCreateM.data ?? null}
                error={(autoCreateM.error as Error | null)?.message ?? authMessage ?? null}
                onAutoCreate={() => requestAutoCreate(query || `A ${type} for general use`)}
                onUseLocal={() => setOpenItem(makeBlank(type, query))}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered
                  .slice()
                  .sort((a, b) => b.popularity - a.popularity)
                  .map((it) => (
                    <ResultCard key={it.id} item={it} onCustomize={() => setOpenItem(it)} />
                  ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {openItem && <Customizer item={openItem} onClose={() => setOpenItem(null)} />}

      <Footer />
    </div>
  );
}

/* ---------------- result card ---------------- */

function ResultCard({ item, onCustomize }: { item: Item; onCustomize: () => void }) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/marketplace/$packageId"
          params={{ packageId: item.id }}
          className="min-w-0 truncate font-mono text-[14px] font-semibold hover:text-primary"
        >
          {item.name}
        </Link>
        <TypeChip type={item.type} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {item.author} · {item.category}
      </div>
      <p className="mt-3 text-sm text-foreground/85">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground"
          >
            #{t}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="font-mono text-[11px] text-muted-foreground">
          ↓ {formatCount(item.popularity)}
        </span>
        <button
          onClick={onCustomize}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-95"
        >
          Customize & install
        </button>
      </div>
    </article>
  );
}

function TypeChip({ type }: { type: Type }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {TYPE_META[type].label}
    </span>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

/* ---------------- facet group ---------------- */

function FacetGroup({
  label,
  options,
  value,
  onChange,
  count,
  allCount,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  count: (c: string) => number;
  allCount: number;
}) {
  return (
    <div>
      <div className="mb-2 px-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => onChange(null)}
            className={
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
              (value === null ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
            }
          >
            <span>All</span>
            <span className="font-mono text-[10px]">{allCount}</span>
          </button>
        </li>
        {options.map((o) => (
          <li key={o}>
            <button
              onClick={() => onChange(o)}
              className={
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
                (value === o
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
              }
            >
              <span className="truncate">{o}</span>
              <span className="font-mono text-[10px]">{count(o)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- empty state ---------------- */

function EmptyState({
  type,
  query,
  isPending,
  result,
  error,
  onAutoCreate,
  onUseLocal,
}: {
  type: Type;
  query: string;
  isPending: boolean;
  result: Awaited<ReturnType<typeof autoCreateMissing>> | null;
  error: string | null;
  onAutoCreate: () => void;
  onUseLocal: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
      <div className="mx-auto inline-flex size-10 items-center justify-center rounded-full bg-primary/10 font-mono text-primary">
        ›_
      </div>
      <h3 className="mt-4 text-lg font-semibold">No matching {TYPE_META[type].plural.toLowerCase()} yet.</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        SkillForge can research the state of the art and ship a beta — usually in under a minute.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onAutoCreate}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {isPending ? "Researching → authoring → evaluating…" : `Auto-create "${query || `custom ${type}`}"`}
        </button>
        <button
          onClick={onUseLocal}
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted/40"
        >
          Open blank customizer
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mx-auto mt-4 max-w-xl rounded-md border border-border bg-background p-4 text-left text-sm">
          <p className="font-medium">Shipped: {result.package.name}</p>
          <p className="text-xs text-muted-foreground">
            slug <code>{result.package.slug}</code> · research {result.research_used ? "✓" : "—"} ·
            {" "}{result.stages.length} pipeline stages
          </p>
          {result.evaluation && (
            <p className="mt-1 text-xs">
              Evaluator: overall {Math.round(result.evaluation.overall_score)} ·
              verdict <strong>{result.evaluation.verdict}</strong>
            </p>
          )}
          <Link
            to="/marketplace/$packageId"
            params={{ packageId: result.package.slug }}
            className="mt-2 inline-block text-xs text-primary underline"
          >
            View in marketplace →
          </Link>
        </div>
      )}
    </div>
  );
}

function makeBlank(type: Type, query: string): Item {
  return {
    id: `custom-${type}`,
    name: (query || `custom-${type}`).toLowerCase().replace(/\s+/g, "-"),
    type,
    category: "Custom",
    tags: ["generated"],
    description: `A brand-new ${type} generated by SkillForge from your prompt.`,
    popularity: 0,
    author: "@you",
  };
}

/* ---------------- customizer ---------------- */

function Customizer({ item, onClose }: { item: Item; onClose: () => void }) {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [governance, setGovernance] = useState("L2");
  const [mode, setMode] = useState<"chat" | "mcp">("chat");
  const [chat, setChat] = useState<{ from: "you" | "superagentskill"; text: string }[]>([
    {
      from: "superagentskill",
      text: `Got it — let's tailor ${item.name}. Tell me your industry, style and what matters most. You can also paste examples or links.`,
    },
  ]);

  function addPriority() {
    const v = draft.trim();
    if (!v) return;
    if (mode === "chat") {
      setChat((c) => [
        ...c,
        { from: "you", text: v },
        {
          from: "superagentskill",
          text: `Noted. I'll bias this ${item.type} toward "${v}" for ${industry} with a ${style.toLowerCase()} tone.`,
        },
      ]);
    }
    if (!priorities.includes(v)) setPriorities((p) => [...p, v]);
    setDraft("");
  }

  function removePriority(p: string) {
    setPriorities((arr) => arr.filter((x) => x !== p));
  }

  const mcpCommand = useMemo(() => {
    const safeName = item.name;
    const opts = [
      `--industry "${industry}"`,
      `--style "${style.toLowerCase()}"`,
      `--governance ${governance}`,
      ...priorities.map((p) => `--priority "${p}"`),
    ];
    return `superagentskill install ${item.type} ${safeName} \\\n  ${opts.join(" \\\n  ")}`;
  }, [item, industry, style, governance, priorities]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-background/60 backdrop-blur-sm animate-fade-in"
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-elevated animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TypeChip type={item.type} />
              <span className="truncate font-mono text-[13px] font-semibold">{item.name}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div className="border-b border-border px-5 py-3">
          <div className="inline-flex h-9 items-center rounded-md border border-border bg-surface p-0.5 text-xs font-medium">
            <button
              onClick={() => setMode("chat")}
              className={
                "h-8 rounded-[4px] px-3 transition-colors " +
                (mode === "chat" ? "bg-background shadow-sm" : "text-muted-foreground")
              }
            >
              💬 Customize via chat
            </button>
            <button
              onClick={() => setMode("mcp")}
              className={
                "h-8 rounded-[4px] px-3 transition-colors " +
                (mode === "mcp" ? "bg-background shadow-sm" : "text-muted-foreground")
              }
            >
              ›_ MCP command
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-5">
          {/* Form */}
          <div className="space-y-5">
            <Field label="Industry">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Field>

            <Field label="Style / tone">
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition-colors " +
                      (style === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            {item.type === "guardrail" && (
              <Field label="Governance level">
                <div className="grid gap-2">
                  {GOVERNANCE_LEVELS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setGovernance(g.key)}
                      className={
                        "rounded-lg border p-3 text-left transition-colors " +
                        (governance === g.key
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface hover:border-primary/30")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{g.label}</span>
                        {governance === g.key && (
                          <span className="font-mono text-[10px] text-primary">SELECTED</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{g.body}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="What matters most" hint="Add as many as you want. Press Enter.">
              {priorities.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {priorities.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs"
                    >
                      {p}
                      <button
                        onClick={() => removePriority(p)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${p}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          {/* Chat or MCP */}
          {mode === "chat" ? (
            <div className="mt-6">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Tell Super Agent Skill what to optimize for
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={
                      "max-w-[88%] rounded-lg px-3 py-2 text-[13px] leading-relaxed animate-fade-in " +
                      (m.from === "you"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-background text-foreground")
                    }
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Equivalent MCP command
              </div>
              <pre className="overflow-auto rounded-lg border border-border bg-[oklch(0.14_0.01_270)] p-4 font-mono text-[12px] leading-relaxed text-white">
                <span className="text-primary">$</span> {mcpCommand}
              </pre>
              <div className="mt-2 text-xs text-muted-foreground">
                Run this in any MCP-compatible agent (Claude, Cursor, Codex, Grok…) to install and
                customize in one shot.
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-surface/50 p-3">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPriority();
                }
              }}
              placeholder={
                mode === "chat"
                  ? `Ex: "always cite ESC 2026 guidelines" or "never mention competitors"`
                  : "Add a --priority value and press Enter"
              }
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={addPriority}
              className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              Add
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Health Score impact:{" "}
              <span className="font-mono text-signal-foreground">
                +{(1 + priorities.length * 0.4).toFixed(1)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
            >
              Install with these settings
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
