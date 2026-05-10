import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { TypingLines } from "@/components/site/Typewriter";
import { PACKAGES, type Package } from "@/data/packages";

export const Route = createFileRoute("/skillforge")({
  component: SkillForgePage,
  head: () => ({
    meta: [
      { title: "SkillForge AI · Super Agent Skill" },
      {
        name: "description",
        content:
          "SkillForge AI continuously analyzes your agent and recommends the upgrades that move your Health Score the most.",
      },
    ],
  }),
});

type InstalledState = {
  pkg: Package;
  installedVersion: string;
  outdated: boolean;
};

const INSTALLED_IDS: Record<string, { version: string; outdated: boolean }> = {
  "cardiology-diagnostics": { version: "2.0.4", outdated: true },
  "medical-guardrails": { version: "0.9.0", outdated: false },
  "mckinsey-consultant": { version: "2.3.0", outdated: false },
};

const RECOMMENDED_IDS = ["enterprise-sales-flow", "steve-jobs-soul", "growth-hacking-pro"];

function SkillForgePage() {
  const installed = useMemo<InstalledState[]>(
    () =>
      PACKAGES.filter((p) => INSTALLED_IDS[p.id]).map((p) => ({
        pkg: p,
        installedVersion: INSTALLED_IDS[p.id].version,
        outdated: INSTALLED_IDS[p.id].outdated,
      })),
    [],
  );

  const recommended = useMemo(
    () => PACKAGES.filter((p) => RECOMMENDED_IDS.includes(p.id)),
    [],
  );

  const [scanning, setScanning] = useState(false);
  const [healthScore, setHealthScore] = useState(86.4);
  const [actions, setActions] = useState<{ id: string; status: "queued" | "running" | "done" }[]>(
    [],
  );

  function runScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setHealthScore((s) => Math.min(99.9, s + 0.6));
    }, 4200);
  }

  function queueAction(id: string, label: string) {
    if (actions.find((a) => a.id === id)) return;
    setActions((a) => [...a, { id, status: "running" }]);
    setTimeout(() => {
      setActions((a) => a.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
      setHealthScore((s) => Math.min(99.9, s + (label === "upgrade" ? 2.1 : 1.4)));
    }, 1800);
  }

  const ringPct = Math.max(0, Math.min(100, healthScore));

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-border/70 pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span className="size-1.5 rounded-full bg-signal pulse-dot" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">
                SkillForge AI · live
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Your agent, continuously upgraded.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              SkillForge analyzes every interaction, finds capability gaps, and recommends the
              skills, playbooks and souls that move your Health Score the most.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runScan}
              disabled={scanning}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              {scanning ? "Scanning agent…" : "Run capability scan"}
            </button>
            <Link
              to="/marketplace"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              Open marketplace
            </Link>
          </div>
        </div>

        {/* Top grid: Health + Live console */}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <HealthScoreCard score={healthScore} ringPct={ringPct} installed={installed.length} />
          <div className="lg:col-span-2">
            <ConsoleCard scanning={scanning} actions={actions} />
          </div>
        </section>

        {/* Recommendations */}
        <section className="mt-12">
          <SectionHeader
            title="Recommended upgrades"
            subtitle="Ranked by predicted Health Score impact for your current agent profile."
            badge={`${recommended.length} suggested`}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((pkg, i) => (
              <RecommendationCard
                key={pkg.id}
                pkg={pkg}
                impact={[3.4, 2.1, 1.6][i] ?? 1.2}
                reason={
                  [
                    "12 unhandled enterprise-deal patterns detected in last 7 days.",
                    "Decision-making latency above team baseline by 28%.",
                    "Activation experiments referenced 4× without a structured framework.",
                  ][i] ?? "Predicted capability gap."
                }
                running={actions.find((a) => a.id === pkg.id)?.status === "running"}
                done={actions.find((a) => a.id === pkg.id)?.status === "done"}
                onInstall={() => queueAction(pkg.id, "install")}
              />
            ))}
          </div>
        </section>

        {/* Installed */}
        <section className="mt-12">
          <SectionHeader
            title="Installed packages"
            subtitle="What your agent is running right now. Hot-swap any version with zero downtime."
            badge={`${installed.length} installed`}
          />
          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Installed</th>
                  <th className="px-4 py-3 font-medium">Latest</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {installed.map(({ pkg, installedVersion, outdated }) => {
                  const action = actions.find((a) => a.id === pkg.id);
                  const upgraded = action?.status === "done";
                  const running = action?.status === "running";
                  return (
                    <tr key={pkg.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <Link
                          to="/marketplace/$packageId"
                          params={{ packageId: pkg.id }}
                          className="font-mono text-[13px] font-medium hover:text-primary"
                        >
                          {pkg.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{pkg.author}</div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={pkg.type} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px]">
                        {upgraded ? pkg.latest : installedVersion}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                        {pkg.latest}
                      </td>
                      <td className="px-4 py-3">
                        {upgraded ? (
                          <StatusPill tone="signal">Up to date</StatusPill>
                        ) : outdated ? (
                          <StatusPill tone="primary">Upgrade available</StatusPill>
                        ) : (
                          <StatusPill tone="signal">Up to date</StatusPill>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {outdated && !upgraded && (
                            <button
                              onClick={() => queueAction(pkg.id, "upgrade")}
                              disabled={running}
                              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
                            >
                              {running ? "Upgrading…" : "Upgrade"}
                            </button>
                          )}
                          <Link
                            to="/marketplace/$packageId"
                            params={{ packageId: pkg.id }}
                            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge && (
        <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:inline-flex">
          {badge}
        </span>
      )}
    </div>
  );
}

function HealthScoreCard({
  score,
  ringPct,
  installed,
}: {
  score: number;
  ringPct: number;
  installed: number;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (ringPct / 100) * c;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Agent Health Score
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Updated · just now</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-medium text-signal-foreground">
          <span className="size-1.5 rounded-full bg-signal pulse-dot" /> live
        </span>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 800ms cubic-bezier(.2,.8,.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-3xl font-semibold tracking-tight">
              {score.toFixed(1)}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              / 100
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <ScoreBar label="Reasoning" value={92} />
          <ScoreBar label="Domain expertise" value={78} />
          <ScoreBar label="Safety & guardrails" value={96} />
          <ScoreBar label="Tool fluency" value={71} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
        <Stat label="Installed" value={String(installed)} />
        <Stat label="Suggested" value="3" />
        <Stat label="Trend 7d" value="+4.2" tone="signal" />
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${value}%`, transition: "width 600ms ease-out" }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "signal";
}) {
  return (
    <div>
      <div
        className={
          "font-mono text-lg font-semibold " +
          (tone === "signal" ? "text-signal-foreground" : "")
        }
      >
        {tone === "signal" && (
          <span className="mr-1 inline-block size-1.5 translate-y-[-2px] rounded-full bg-signal align-middle" />
        )}
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ConsoleCard({
  scanning,
  actions,
}: {
  scanning: boolean;
  actions: { id: string; status: string }[];
}) {
  const lines = scanning
    ? [
        "$ skillforge scan --agent prod",
        "→ Probing 412 interactions from last 7d...",
        "→ Mapping capability surface vs. tasks observed...",
        "✓ 3 capability gaps detected",
        "✓ 1 outdated dependency: cardiology-diagnostics@2.0.4",
        "● Recommendations refreshed. Health Score recomputed.",
      ]
    : [
        "$ skillforge watch",
        "→ Listening on MCP gateway...",
        "✓ Agent online · 12 tools · 3 souls",
        "● SkillForge ready. Run a scan or accept a recommendation.",
      ];

  return (
    <div className="h-full overflow-hidden rounded-xl border border-border bg-[oklch(0.14_0.01_270)] text-[13px] text-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-white/60">
            skillforge.console
          </span>
        </div>
        <span className="font-mono text-[11px] text-white/40">mcp://prod-agent</span>
      </div>
      <div className="px-4 py-4 font-mono leading-6">
        <TypingLines
          key={scanning ? "scan" : "idle"}
          lines={lines}
          speed={14}
          lineClassName={(l) =>
            l.startsWith("✓")
              ? "text-signal"
              : l.startsWith("●")
              ? "text-signal font-medium"
              : l.startsWith("$")
              ? "text-primary"
              : "text-white/85"
          }
        />
        {actions.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            {actions.map((a) => (
              <div key={a.id} className="text-white/85">
                {a.status === "running" ? (
                  <>
                    <span className="text-primary">$</span> skillforge install {a.id}{" "}
                    <span className="text-white/50">…streaming</span>
                  </>
                ) : (
                  <>
                    <span className="text-signal">✓</span> installed {a.id}{" "}
                    <span className="text-white/50">· health +impact applied</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({
  pkg,
  impact,
  reason,
  running,
  done,
  onInstall,
}: {
  pkg: Package;
  impact: number;
  reason: string;
  running: boolean;
  done: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TypeBadge type={pkg.type} />
            <span className="font-mono text-[11px] text-muted-foreground">
              v{pkg.latest}
            </span>
          </div>
          <Link
            to="/marketplace/$packageId"
            params={{ packageId: pkg.id }}
            className="mt-2 block truncate font-mono text-[14px] font-semibold hover:text-primary"
          >
            {pkg.name}
          </Link>
        </div>
        <div className="shrink-0 rounded-md border border-signal/40 bg-signal/15 px-2 py-1 text-right font-mono">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Health
          </div>
          <div className="text-sm font-semibold text-signal-foreground">+{impact.toFixed(1)}</div>
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground/85">{pkg.description}</p>

      <div className="mt-3 rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Why this:</span> {reason}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>★ {pkg.rating.toFixed(1)}</span>
          <span>↓ {pkg.downloads}</span>
          <span className="font-mono">{pkg.size}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/marketplace/$packageId"
            params={{ packageId: pkg.id }}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-accent"
          >
            Details
          </Link>
          <button
            onClick={onInstall}
            disabled={running || done}
            className={
              "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium " +
              (done
                ? "bg-signal text-signal-foreground"
                : "bg-primary text-primary-foreground hover:opacity-95")
            }
          >
            {done ? "Installed" : running ? "Installing…" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: Package["type"] }) {
  const map: Record<Package["type"], string> = {
    skill: "Skill",
    playbook: "Playbook",
    soul: "Soul",
    guardrail: "Guardrail",
  };
  return (
    <span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {map[type]}
    </span>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "signal";
}) {
  if (tone === "signal") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-medium text-signal-foreground">
        <span className="size-1.5 rounded-full bg-signal" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      <span className="size-1.5 rounded-full bg-primary pulse-dot" />
      {children}
    </span>
  );
}
