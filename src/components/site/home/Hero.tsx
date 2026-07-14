import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CopyButton } from "@/components/site/CopyButton";
import { CountUp } from "@/components/site/CountUp";
import { SITE_STATS, SKILLS_LABEL } from "@/lib/site-stats";
import { useTrack, useTrackOnce } from "@/lib/telemetry/use-track";

const McpInstallAnimation = lazy(() =>
  import("@/components/site/McpInstallAnimation").then((m) => ({ default: m.McpInstallAnimation })),
);

const MCP_URL = "https://superagentskill.com/api/mcp";

/**
 * Conversion-first hero: one static headline (no rotating text — it caused
 * overflow, layout shift and comprehension problems), one primary CTA, and
 * the raw MCP URL demoted to a compact secondary path for people who already
 * know what MCP is. The step-by-step connect flow lives at /connect.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 md:pt-20 lg:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* LEFT — message + primary action */}
          <div className="relative z-10 min-w-0 fade-up text-center lg:text-left">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
              <span className="min-w-0 truncate sm:whitespace-normal">
                {SKILLS_LABEL} signed skills · Free to start
              </span>
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Turn Claude, Cursor or ChatGPT into{" "}
              <span className="text-primary">an expert in your field</span> — in 30 seconds.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              Paste one link and your agent gains{" "}
              <span className="text-foreground">{SKILLS_LABEL} expert skills</span> — every one
              signed, tested against jailbreaks and scored in public. No code. No fine-tuning.
            </p>

            {/* One primary action, one visually subordinate alternative */}
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/connect"
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-elevated transition-all hover:scale-[1.02] hover:opacity-95 sm:w-auto"
              >
                Connect your agent — free →
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-surface-elevated px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
              >
                Browse the skills
              </Link>
            </div>
            <p className="mx-auto mt-3 max-w-[22rem] text-xs leading-relaxed text-muted-foreground sm:max-w-none lg:mx-0">
              Free forever: unlimited public skills via the MCP gateway · No credit card · No
              signup to browse · Open source (Apache 2.0)
            </p>

            {/* Proof strip */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href="https://github.com/criptogus/agent-evolve-network"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star on GitHub"
              >
                <img
                  src="https://img.shields.io/github/stars/criptogus/agent-evolve-network?style=social"
                  alt="GitHub stars"
                  className="h-5"
                  loading="lazy"
                />
              </a>
              <a
                href="https://superagentskill.com/community"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Join the Discord
              </a>
              <span className="text-xs text-muted-foreground">
                Every skill adversarially tested before publish
              </span>
            </div>

            {/* Secondary path for people who already know MCP */}
            <div className="mx-auto mt-8 max-w-xl rounded-xl border border-border bg-background/80 p-3 text-left shadow-sm backdrop-blur lg:mx-0">
              <p className="px-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Already use MCP?</span> Paste this URL
                into your client — it works instantly, no restart.
              </p>
              <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1">
                  <span className="hidden font-mono text-[10px] uppercase tracking-wider text-primary sm:inline">
                    MCP
                  </span>
                  <code className="truncate font-mono text-xs text-foreground sm:text-sm">
                    {MCP_URL}
                  </code>
                </div>
                <CopyButton
                  value={MCP_URL}
                  label="Copy URL"
                  className="shrink-0 px-2 sm:px-2.5"
                  shortLabel="Copy"
                />
              </div>
            </div>
          </div>

          {/* RIGHT — live install demo */}
          <div id="connect" className="min-w-0 fade-up lg:pl-2">
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

        {/* Trust metrics — one quiet line, not four competing cards */}
        <dl className="mt-12 grid grid-cols-2 gap-y-6 border-t border-border/60 pt-8 text-center sm:grid-cols-4 sm:divide-x sm:divide-border/60">
          {[
            { v: SITE_STATS.skills, suffix: "+", label: "Expert skills" },
            { v: SITE_STATS.playbooks, suffix: "+", label: "Playbooks" },
            { v: SITE_STATS.souls, suffix: "+", label: "Souls (expert personas)" },
            { v: SITE_STATS.mcpSetupSeconds, suffix: "s", label: "Setup time" },
          ].map((m) => (
            <div key={m.label} className="flex min-w-0 flex-col px-2">
              <dt className="order-2 mt-1.5 text-[11px] uppercase leading-tight tracking-wider text-muted-foreground">
                {m.label}
              </dt>
              <dd className="order-1 font-mono text-2xl font-semibold leading-none tracking-tight text-foreground">
                <CountUp to={m.v} suffix={m.suffix} decimals={0} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
