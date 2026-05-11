import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { matchAgentToPackages, type AgentMatchResult } from "@/lib/match/match.functions";
import { McpRecommendations } from "@/components/match/McpRecommendations";

type FullResult = AgentMatchResult & { catalog_size: number };

export const Route = createFileRoute("/match")({
  head: () => ({
    meta: [
      { title: "Agent ↔ Skills Match Evaluator — Super Agent Skill" },
      {
        name: "description",
        content:
          "Describe what your AI agent should do. We score every skill, playbook, soul and guardrail in the catalog and recommend the best kit, with rationale and capability gaps.",
      },
    ],
  }),
  component: MatchPage,
});

const SAMPLE = `Outbound SDR agent for B2B SaaS. It enriches a list of accounts, picks the right ICP fit, writes a 4-touch sequence (LinkedIn + email), books meetings via Calendly link, hands off to AE on positive reply, and never makes claims about pricing or roadmap. Tone: confident, peer-to-peer, no buzzwords.`;

function MatchPage() {
  const matchFn = useServerFn(matchAgentToPackages);
  const [brief, setBrief] = useState(SAMPLE);
  const [vertical, setVertical] = useState("B2B SaaS · Outbound");
  const m = useMutation<FullResult, Error, { brief: string; vertical?: string }>({
    mutationFn: async (vars) => (await matchFn({ data: vars })) as FullResult,
  });

  const onRun = () => {
    if (brief.trim().length < 20) return;
    m.mutate({ brief: brief.trim(), vertical: vertical.trim() || undefined });
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Agent Match Evaluator</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            Describe the agent. We pick the kit.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Score every primitive in the catalog against your agent brief. Get a balanced kit
            (skills + playbooks + souls + guardrails) with rationale, fit score and the gaps you
            still need to author.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:p-6">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Agent brief</span>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="What should the agent do? Who is it for? What must it never do?"
            />
            <span className="text-xs text-muted-foreground">{brief.length}/4000</span>
          </label>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Vertical (optional)</span>
              <input
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Healthcare, B2B SaaS, Personal finance"
              />
            </label>
            <button
              onClick={onRun}
              disabled={m.isPending || brief.trim().length < 20}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {m.isPending ? "Scoring against catalog…" : "Run match evaluator"}
            </button>
          </div>
        </section>

        {m.isError && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(m.error as Error).message}
          </div>
        )}

        {m.isPending && <PendingPanel />}

        {m.data && <ResultPanel data={m.data} />}
      </main>
      <Footer />
    </div>
  );
}

function PendingPanel() {
  const steps = [
    "Reading brief & extracting jobs-to-be-done",
    "Fetching the full primitive catalog",
    "Scoring every package against agent intent",
    "Composing a balanced kit (skills · playbooks · souls · guardrails)",
    "Identifying coverage gaps to author next",
  ];
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-sm font-medium">Evaluator running…</p>
      <ul className="grid gap-2 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
              style={{ animationDelay: `${i * 120}ms` }}
            />
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultPanel({ data }: { data: FullResult }) {
  const groups: Array<{
    key: keyof FullResult["recommended_kit"];
    label: string;
    accent: string;
  }> = [
    { key: "skills", label: "Skills", accent: "bg-primary/10 text-primary" },
    { key: "playbooks", label: "Playbooks", accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { key: "souls", label: "Souls", accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { key: "guardrails", label: "Guardrails", accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  ];

  const fit = Math.round(data.coverage.overall_fit_score);

  return (
    <section className="mt-6 grid gap-6">
      {/* Header card */}
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-4">
          <FitGauge value={fit} />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall fit</p>
            <p className="text-2xl font-semibold">{fit}/100</p>
            <p className="text-xs text-muted-foreground">
              scored across {data.catalog_size} packages
            </p>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <p className="font-medium">{data.agent_summary.one_liner}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">For:</span> {data.agent_summary.target_user}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Success metric:</span>{" "}
            {data.agent_summary.success_metric}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {data.agent_summary.primary_jobs.map((j) => (
              <span key={j} className="rounded-md border border-border bg-background px-2 py-0.5 text-xs">
                {j}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended kit */}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => {
          const items = data.recommended_kit[g.key];
          return (
            <div key={g.key} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{g.label}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${g.accent}`}>
                  {items.length} picked
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {g.label.toLowerCase()} matched with score ≥ 5. See gaps below.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {items.map((it) => (
                    <li key={it.slug} className="rounded-xl border border-border/70 bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            to="/marketplace/$packageId"
                            params={{ packageId: it.slug }}
                            className="text-sm font-medium hover:underline"
                          >
                            {it.slug}
                          </Link>
                          <p className="text-xs text-muted-foreground">{it.role}</p>
                        </div>
                        <ScoreBadge score={it.score} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{it.why}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage strengths/risks */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            {data.coverage.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold">Risks</h3>
          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            {data.coverage.risks.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Gaps */}
      {data.gaps.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Capability gaps to author</h3>
            <Link
              to="/forge"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open SkillForge →
            </Link>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.gaps.map((g) => (
              <li key={g.capability} className="rounded-xl border border-border/70 bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{g.capability}</p>
                  <span className="rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {g.recommended_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{g.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* External MCP recommendations */}
      <McpRecommendations
        recommended={data.recommended_mcps ?? []}
        kitSlugs={[
          ...data.recommended_kit.skills,
          ...data.recommended_kit.playbooks,
          ...data.recommended_kit.souls,
          ...data.recommended_kit.guardrails,
        ].map((i) => i.slug)}
        brief={data.agent_summary.one_liner}
      />

      {/* Rationale */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold">Evaluator rationale</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {data.rationale}
        </p>
      </div>
    </section>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const v = Math.round(score * 10) / 10;
  const tone =
    v >= 9
      ? "bg-primary/15 text-primary"
      : v >= 7
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {v.toFixed(1)}
    </span>
  );
}

function FitGauge({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 72 72" width={72} height={72} className="shrink-0">
      <circle cx="36" cy="36" r={r} className="fill-none stroke-border" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        className="fill-none stroke-primary"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="40"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="16"
        fontWeight="600"
      >
        {value}
      </text>
    </svg>
  );
}
