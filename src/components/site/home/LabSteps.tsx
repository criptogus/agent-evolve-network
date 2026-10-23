import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { CopyButton } from "@/components/site/CopyButton";
import { GradeImpact } from "./GradeImpact";

const McpInstallAnimation = lazy(() =>
  import("@/components/site/McpInstallAnimation").then((m) => ({ default: m.McpInstallAnimation })),
);

const MCP_URL = "https://superagentskill.com/api/public/mcp";

const HARNESSES = ["Claude", "Codex", "Hermes", "ChatGPT", "Cursor", "Cline", "Any MCP client"];

// Illustrative version history — shows the shape of the audit trail, not
// customer data. Labelled as illustrative in the UI.
const VERSIONS = [
  { v: "v1", score: 27, grade: "F" },
  { v: "v2", score: 41, grade: "D" },
  { v: "v3", score: 58, grade: "C" },
  { v: "v4", score: 67, grade: "C" },
  { v: "v5", score: 74, grade: "B" },
  { v: "v6", score: 83, grade: "B" },
  { v: "v7", score: 91, grade: "A", ships: true },
];

function StepHeader({
  n,
  kicker,
  title,
  children,
}: {
  n: string;
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-primary">{n}</span>
        <span className="h-px w-6 bg-border" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </span>
      </div>
      <h3 className="mt-3 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h3>
      {children && (
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          {children}
        </p>
      )}
    </div>
  );
}

/**
 * The five numbered proof steps: Measure → Loop → Benchmark → Audit trail →
 * Export. Each step is one idea with one visual, so the page reads as evidence
 * instead of marketing.
 */
export function LabSteps() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The lab</span>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
          Every capability is scored, repaired and re-scored before it reaches your agent.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Upload a skill or describe an agent. The lab grades it, fixes what fails, saves each
          attempt as a version, and only ships the one that passes.
        </p>

        {/* 01 — Measure */}
        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <StepHeader n="01" kicker="Measure" title="Every version gets a Trust Score.">
            The lab builds the evaluation cases, runs them, and scores format, substance, safety and
            schema validity into one number. Below the bar, the skill stays in the lab.
          </StepHeader>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-end justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Trust Score</span>
              <span>ship threshold 90</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "No skill", value: 52 },
                { label: "First draft", value: 60 },
                { label: "Lab-tested version", value: 91 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{row.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full rounded-full ${row.value >= 90 ? "bg-signal" : "bg-muted-foreground/50"}`}
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Illustrative scale
            </p>
          </div>
        </div>

        {/* 02 — The loop */}
        <div className="mt-20 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <StepHeader n="02" kicker="The loop" title="Test. Repair. Re-score.">
            Watch a grade-F skill get taken apart and rebuilt. Each pass becomes a new version, and a
            version only survives if it scores higher than the one before it.
          </StepHeader>
          <div className="min-w-0">
            <Suspense
              fallback={
                <div
                  className="h-[420px] animate-pulse rounded-xl border border-border bg-surface"
                  aria-hidden
                />
              }
            >
              <McpInstallAnimation />
            </Suspense>
          </div>
        </div>

        {/* 03 — Benchmark */}
        <div className="mt-20">
          <StepHeader n="03" kicker="Benchmark" title="Base agent vs lab-tested agent.">
            No capability ships on trust. Here is the difference an A-grade skill makes across the
            metrics that decide whether you can put an agent in front of a customer.
          </StepHeader>
        </div>
      </div>

      <GradeImpact />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        {/* 04 — Audit trail */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <StepHeader n="04" kicker="Audit trail" title="Every version, on file.">
            Each review is stored with its score delta, so you can see exactly which change moved the
            number — and prove it later to a customer, an auditor or your own team.
          </StepHeader>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              review history
            </div>
            <ul className="mt-4 divide-y divide-border">
              {VERSIONS.map((row) => (
                <li key={row.v} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-8 font-mono text-xs text-muted-foreground">{row.v}</span>
                  <span className="flex-1">
                    <span className="block h-1.5 rounded-full bg-surface">
                      <span
                        className={`block h-1.5 rounded-full ${row.ships ? "bg-signal" : "bg-primary/50"}`}
                        style={{ width: `${row.score}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-8 text-right font-mono text-xs tabular-nums">{row.score}</span>
                  <span
                    className={`w-12 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] ${
                      row.ships
                        ? "border-signal/40 bg-signal/10 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {row.grade}
                    {row.ships ? " ✓" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Illustrative history
            </p>
          </div>
        </div>

        {/* 05 — Export */}
        <div className="mt-20 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <StepHeader n="05" kicker="Export" title="Run it anywhere, in one line.">
            Install through the MCP endpoint or download the file. The same tested capability runs in
            every major agent harness, with any model.
          </StepHeader>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {HARNESSES.map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="mt-5 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
              <code className="truncate px-1 font-mono text-xs text-foreground sm:text-sm">
                {MCP_URL}
              </code>
              <CopyButton value={MCP_URL} label="Copy URL" shortLabel="Copy" className="shrink-0" />
            </div>
            <Link
              to="/connect"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              See the setup for my client →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
