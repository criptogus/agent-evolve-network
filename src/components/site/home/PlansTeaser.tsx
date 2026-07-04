import { Link } from "@tanstack/react-router";
import { PACKAGES_LABEL } from "@/lib/site-stats";

// Plan names must match /pricing exactly: Hacker, Agent Pass, Enterprise.
export function PlansTeaser() {
  const hacker = [
    `${PACKAGES_LABEL} public skills, playbooks, souls (drop-in expert personas) & guardrails — unlimited via the MCP gateway, no account needed`,
    "MCP gateway for any agent (Claude, Cursor, ChatGPT…)",
    "Free account adds per-package installs, library sync & reviews",
    "Public registry, GitHub-native, fork anything",
  ];
  const agentPass = [
    "SkillForge auto-patching — skills stay current automatically",
    "Continuous jailbreak re-testing on every installed skill",
    "Health scoring & weekly reports per agent",
    "Priority skills & all marketplace packages included",
  ];
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Start free. Upgrade when your agent needs{" "}
            <span className="text-primary">superpowers</span>.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Hacker is free forever — every public skill, via one MCP URL, no account. Agent Pass is
            $19 per agent per month: your agent's skills stay current and jailbreak-hardened
            automatically. Enterprise adds private registry, SSO and audit logs.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Open registry
                </div>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                  Hacker — free forever
                </h3>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Apache 2.0 · CC BY-SA
              </span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {hacker.map((f) => (
                <li key={f} className="flex gap-3 text-foreground/90">
                  <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/marketplace"
              className="mt-7 inline-flex h-10 items-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Browse the open registry →
            </Link>
          </div>

          <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 via-background to-signal/5 p-7 shadow-elevated">
            <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
              Most chosen
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  $19 / agent / month
                </div>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">Agent Pass</h3>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                + Enterprise
              </span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {agentPass.map((f) => (
                <li key={f} className="flex gap-3 text-foreground/95">
                  <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-7 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
            >
              See all plans →
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          The open network feeds the premium layer, and the premium layer funds the open network.
          That's the flywheel.
        </p>
      </div>
    </section>
  );
}
