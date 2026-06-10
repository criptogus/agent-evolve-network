import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { BadgeCheck, Landmark, ShieldAlert, Clock } from "lucide-react";
import { Typewriter } from "@/components/site/Typewriter";
import { CopyButton } from "@/components/site/CopyButton";
import { CountUp } from "@/components/site/CountUp";
import { SITE_STATS, SKILLS_LABEL } from "@/lib/site-stats";

const McpInstallAnimation = lazy(() =>
  import("@/components/site/McpInstallAnimation").then((m) => ({ default: m.McpInstallAnimation })),
);

const CONNECT_TOOLS: { id: string; label: string; steps: string }[] = [
  { id: "claude", label: "Claude", steps: "Paste into Claude → Settings → Connectors." },
  { id: "cursor", label: "Cursor", steps: "Paste into Cursor → Settings → MCP → Add server." },
  {
    id: "chatgpt",
    label: "ChatGPT",
    steps: "Add as a connector in ChatGPT (Settings → Connectors / GPTs).",
  },
  {
    id: "other",
    label: "Other",
    steps: "Add the URL as an MCP server in any MCP-compatible client.",
  },
];

export function Hero() {
  const mcpUrl = "https://superagentskill.com/api/mcp";
  const [toolId, setToolId] = useState("claude");
  const tool = CONNECT_TOOLS.find((t) => t.id === toolId) ?? CONNECT_TOOLS[0];
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 md:pt-20 lg:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* LEFT — message + primary action */}
          <div className="relative z-10 min-w-0 fade-up text-center lg:text-left">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground shadow-sm sm:max-w-none">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
              <span className="min-w-0 truncate sm:whitespace-normal">
                {SKILLS_LABEL} signed skills · Works with Claude, Cursor &amp; ChatGPT
              </span>
            </div>
            <h1 className="mt-5 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-[64px]">
              Turn Claude or Cursor into a{" "}
              <span className="block text-primary text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-[2.75rem] leading-[1.15] mt-1">
                <Typewriter
                  className="inline-block max-w-full break-words"
                  words={[
                    "cybersec expert.",
                    "senior SRE.",
                    "fintech officer.",
                    "HIPAA clinician.",
                    "Stripe expert.",
                    "CRO specialist.",
                  ]}
                />
              </span>
              <span className="mt-2 block text-foreground/90">In 30 seconds. No code.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty px-1 text-base leading-relaxed text-muted-foreground lg:mx-0 lg:px-0 lg:text-lg">
              Paste one link. Your agent gains{" "}
              <span className="text-foreground">{SKILLS_LABEL} expert skills</span> — every one
              signed, tested against jailbreaks, and scored in public. No code. No fine-tuning. Free
              to start.
            </p>

            {/* Benefit cues — why it's worth the 30 seconds */}
            <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:mx-0 lg:justify-start">
              {["Works in 30 seconds", "No code or fine-tuning", "Tested against jailbreaks"].map(
                (b) => (
                  <li key={b} className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-signal" aria-hidden />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ),
              )}
            </ul>

            {/* MCP URL — the primary above-the-fold action */}
            <div className="mt-6 min-w-0 rounded-xl border border-border bg-background/80 p-3 shadow-elevated backdrop-blur">
              {/* Tool picker — swaps the connect instructions */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Connecting
                </span>
                {CONNECT_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setToolId(t.id)}
                    aria-pressed={t.id === toolId}
                    className={
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors " +
                      (t.id === toolId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1 sm:px-2">
                  <span className="hidden font-mono text-[10px] uppercase tracking-wider text-primary sm:inline">
                    MCP
                  </span>
                  <code className="truncate font-mono text-xs text-foreground sm:text-sm">
                    {mcpUrl}
                  </code>
                </div>
                <CopyButton
                  value={mcpUrl}
                  label="Copy URL"
                  className="shrink-0 px-2 sm:px-2.5"
                  shortLabel="Copy"
                />
              </div>
              <p className="mt-2 break-words text-[11px] text-muted-foreground">
                {tool.steps} Works immediately — no restart.
              </p>
            </div>

            {/* Single primary CTA; secondary is a quiet text link */}
            <div className="mt-5 flex flex-col items-center gap-2.5 lg:items-start">
              <Link
                to="/marketplace"
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-elevated transition-all hover:scale-[1.02] hover:opacity-95 sm:w-auto"
              >
                Browse the skills →
              </Link>
              <Link
                to="/connect"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Or walk me through connecting step by step →
              </Link>
            </div>
            <p className="mx-auto mt-3 max-w-[20rem] text-xs leading-relaxed text-muted-foreground sm:max-w-none lg:mx-0">
              Free forever · No signup to browse · No credit card · Open source (Apache 2.0)
            </p>
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

        {/* Trust metrics — slim band spanning full width */}
        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-border/60 pt-8 sm:gap-4 md:grid-cols-4">
          {[
            { Icon: BadgeCheck, v: SITE_STATS.skills, suffix: "+", label: "Skills shipped" },
            { Icon: Landmark, v: SITE_STATS.souls, suffix: "+", label: "Souls available" },
            { Icon: ShieldAlert, v: SITE_STATS.playbooks, suffix: "+", label: "Playbooks ready" },
            { Icon: Clock, v: SITE_STATS.mcpSetupSeconds, suffix: "s", label: "MCP setup" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-3 sm:gap-3 sm:px-4"
            >
              <m.Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <div className="font-mono text-xl font-semibold leading-none tracking-tight text-foreground">
                  <CountUp to={m.v} suffix={m.suffix} decimals={0} />
                </div>
                <div className="mt-1 text-[10px] uppercase leading-tight tracking-wider text-muted-foreground sm:text-[11px]">
                  {m.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
