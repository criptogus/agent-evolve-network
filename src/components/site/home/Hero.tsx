import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, FileCheck2, Lock } from "lucide-react";
import { CopyButton } from "@/components/site/CopyButton";
import { CountUp } from "@/components/site/CountUp";
import { SITE_STATS, SKILLS_LABEL } from "@/lib/site-stats";
import { useTrack, useTrackOnce } from "@/lib/telemetry/use-track";

const MCP_URL = "https://superagentskill.com/api/public/mcp";

const CHECKS = [
  { icon: ShieldCheck, label: "Injection probes", value: "Blocked" },
  { icon: FileCheck2, label: "Format + substance", value: "Scored separately" },
  { icon: Lock, label: "Signed package", value: "Integrity verified" },
] as const;

/**
 * Instrumentation-band hero: one dark, theme-independent surface that reads as
 * a test report instead of a marketing page. One headline, one primary CTA, the
 * MCP URL as the fast path, and an illustrative Trust Report panel on the right
 * so visitors see the artefact they get before they sign up.
 */
export function Hero() {
  useTrackOnce("hero_viewed", { path: "/" });
  const track = useTrack();

  return (
    <section className="relative overflow-hidden bg-deep text-deep-foreground">
      <div className="pointer-events-none absolute inset-0 deep-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-0 deep-glow" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 md:pt-20 lg:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* LEFT — message + primary action */}
          <div className="relative z-10 min-w-0 fade-up text-center lg:text-left">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 pulse-dot" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span className="min-w-0 truncate sm:whitespace-normal">
                Adversarially tested &amp; signed · {SKILLS_LABEL} skills
              </span>
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem]">
              Install tested capabilities in your{" "}
              <span className="text-primary">AI agent</span>
              .
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-deep-muted lg:mx-0 lg:text-lg">
              Connect Claude, Codex, Cursor or ChatGPT once. Every skill, playbook and agent you
              install is scored on format and substance, probed with jailbreaks and shipped with the
              report attached. No code, no fine-tuning, reversible in one command.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/connect"
                onClick={() => track("cta_clicked", { cta: "hero_primary_try", to: "/connect" })}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
              >
                Try with my agent
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/agents"
                onClick={() => track("cta_clicked", { cta: "hero_secondary_agents", to: "/agents" })}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-deep-border bg-deep-elevated px-6 text-[15px] font-medium text-deep-foreground transition-colors hover:bg-deep-elevated/70 sm:w-auto"
              >
                Browse ready-made agents
              </Link>
            </div>

            <p className="mx-auto mt-3 max-w-[22rem] text-xs leading-relaxed text-deep-muted sm:max-w-none lg:mx-0">
              Free tier for public skills · No signup to browse ·{" "}
              <Link
                to="/agents/new"
                className="underline decoration-dotted hover:text-deep-foreground"
              >
                or build a custom agent
              </Link>
            </p>

            {/* Fast path for people who already know MCP */}
            <div className="mx-auto mt-8 max-w-xl text-left lg:mx-0">
              <div className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-deep-muted">
                Fast install via MCP
              </div>
              <div className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-deep-border bg-deep-sunken/80 p-2 backdrop-blur">
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1">
                  <span className="font-mono text-xs text-primary">$</span>
                  <code className="truncate font-mono text-xs text-deep-foreground sm:text-sm">
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
              <p className="mt-2 px-1 text-[11px] text-deep-muted">
                Paste into your client. Some clients need it in a config file plus one restart —
                after that, nothing changes.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href="https://github.com/criptogus/agent-evolve-network"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star Super Agent Skill on GitHub"
              >
                <img
                  src="https://img.shields.io/github/stars/criptogus/agent-evolve-network?style=social"
                  alt="GitHub stars"
                  className="h-5"
                  loading="lazy"
                />
              </a>
              <span className="text-xs text-deep-muted">
                Every package adversarially tested before publish
              </span>
            </div>
          </div>

          {/* RIGHT — the artefact you get, as an illustrative report */}
          <div id="connect" className="relative min-w-0 fade-up lg:pl-2">
            <div
              className="pointer-events-none absolute -inset-6 rounded-full bg-primary/10 blur-3xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-deep-border bg-deep-elevated shadow-panel">
              <div className="flex items-center justify-between border-b border-deep-border bg-deep-sunken/60 px-5 py-3">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-deep-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-deep-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-deep-border" />
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-deep-muted">
                  Trust report · illustrative
                </span>
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">Expo release engineer</h2>
                    <p className="mt-0.5 text-sm text-deep-muted">
                      skill · v2.4.0 · signed by the lab
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-3xl font-semibold leading-none text-primary">
                      <CountUp to={94} />
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-deep-muted">
                      Trust score
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-deep-border bg-deep-sunken/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-deep-muted">Adversarial harness</span>
                    <span className="rounded-full border border-signal/30 bg-signal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal">
                      Passed
                    </span>
                  </div>
                  <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-deep-border sweep">
                    <div className="h-full w-[96%] rounded-full bg-signal" />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-deep-muted">
                    <span>Jailbreak · role-play · exfiltration probes</span>
                    <span className="text-deep-foreground">96% blocked</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {CHECKS.map(({ icon: Icon, label, value }) => (
                    <li
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-deep-border bg-deep-sunken/40 px-3 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm text-deep-muted">
                        <Icon className="h-4 w-4 shrink-0 text-signal" aria-hidden />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-deep-foreground">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-deep-border pt-4">
                  <span className="font-mono text-[11px] text-deep-muted">
                    sha256:8f4a…e21 · ed25519 signed
                  </span>
                  <Link
                    to="/marketplace"
                    onClick={() =>
                      track("cta_clicked", { cta: "hero_registry", to: "/marketplace" })
                    }
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    See the registry →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust metrics — one quiet instrumentation line */}
        <dl className="mt-16 grid grid-cols-2 gap-y-8 border-t border-deep-border pt-10 text-center sm:grid-cols-4 sm:divide-x sm:divide-deep-border lg:text-left">
          {[
            { v: SITE_STATS.skills, suffix: "+", label: "Expert skills" },
            { v: SITE_STATS.playbooks, suffix: "+", label: "Playbooks" },
            { v: SITE_STATS.souls, suffix: "+", label: "Souls (expert personas)" },
            { v: SITE_STATS.mcpSetupSeconds, suffix: "s", label: "Setup time" },
          ].map((m) => (
            <div key={m.label} className="flex min-w-0 flex-col px-2 lg:px-5 lg:first:pl-0">
              <dt className="order-2 mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-deep-muted">
                {m.label}
              </dt>
              <dd className="order-1 font-mono text-3xl font-semibold leading-none tracking-tight text-deep-foreground">
                <CountUp to={m.v} suffix={m.suffix} decimals={0} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
