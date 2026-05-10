import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { TypingLines, Typewriter } from "@/components/site/Typewriter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentForge — MCP Infrastructure for AI Agents" },
      { name: "description", content: "The MCP infrastructure layer for AI agents. Connect any agent to a live network of skills, playbooks, souls, and guardrails. One command, your agent becomes a genius." },
      { property: "og:title", content: "AgentForge — MCP Infrastructure for AI Agents" },
      { property: "og:description", content: "Twilio for agent-to-agent intelligence. The living operating system for AI agents." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Logos />
      <HowItWorks />
      <CoreConcepts />
      <SkillForgeSection />
      <NetworkSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function Hero() {
  const lines = [
    "$ agentforge connect",
    "",
    "→ MCP handshake........................ ok",
    "→ OAuth (short-lived token)............ ok",
    "→ Discovering capabilities............. 4,218",
    "→ Self-assessment...................... 92.4%",
    "→ SkillForge AI: 7 upgrades recommended",
    "",
    "✓ installed  cardiology-soul@2.1.0",
    "✓ installed  enterprise-sales-playbook@1.4.2",
    "✓ installed  legal-guardrails@0.9.0",
    "",
    "● Agent evolved. Health score: 98.3 / 100",
  ];

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center fade-up">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono">v3.0</span>
            <span className="text-border">·</span>
            <span>MCP-native gateway is live</span>
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-7xl">
            One command.
            <br />
            <span className="text-primary">
              Your agent becomes&nbsp;
              <Typewriter
                className="text-foreground"
                words={["a cardiologist.", "a closer.", "a lawyer.", "a strategist.", "a genius."]}
              />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            The MCP infrastructure layer for AI agents. Connect Claude, Cursor, Codex or Grok to a live
            network of skills, playbooks, souls and guardrails — and watch them evolve.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#connect"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
            >
              Connect your agent
            </a>
            <Link
              to="/docs"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Read the docs →
            </Link>
          </div>
        </div>

        <div id="connect" className="mx-auto mt-16 max-w-3xl fade-up">
          <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.14_0.01_270)] text-[13px] shadow-elevated">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.55_0.21_28)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-signal" />
                <span className="ml-3 font-mono text-xs text-white/50">agent.mcp</span>
              </div>
              <span className="font-mono text-[11px] text-white/40">live</span>
            </div>
            <TypingLines
              lines={lines}
              speed={14}
              startDelay={500}
              className="min-h-[330px] px-5 py-5 font-mono leading-relaxed text-white/90"
              lineClassName={(l) =>
                l.startsWith("✓")
                  ? "text-signal"
                  : l.startsWith("●")
                    ? "text-signal font-semibold"
                    : l.startsWith("→")
                      ? "text-white/80"
                      : l.startsWith("$")
                        ? "text-primary"
                        : ""
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const PARTNERS = ["CLAUDE", "CURSOR", "CODEX", "OPENCLAW", "HERMES", "GROK", "LANGCHAIN", "REPLIT"];

function Logos() {
  return (
    <section className="border-b border-border bg-surface/50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Compatible with every major agent runtime
        </p>
        <div className="relative mt-6 overflow-hidden">
          <div className="marquee flex w-max gap-14 whitespace-nowrap">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <span key={i} className="font-mono text-sm tracking-widest text-muted-foreground/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Connect via MCP", body: "Secure OAuth handshake with short-lived tokens. Your agent registers its current capabilities." },
    { n: "02", title: "Self-assess", body: "SkillForge AI scans context, installed skills and historical performance. Identifies weaknesses." },
    { n: "03", title: "Install upgrades", body: "Skills, playbooks, souls and guardrails install automatically — no human in the loop." },
    { n: "04", title: "Evolve continuously", body: "Anonymous feedback flows into the network. Improved versions ship to every agent." },
  ];
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The Evolution Loop</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">From generic assistant to elite specialist.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            AgentForge runs a continuous improvement pipeline across millions of agents. The more it's used, the smarter every connected agent becomes.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-background p-7 transition-colors hover:bg-surface">
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreConcepts() {
  const items = [
    {
      tag: "SKILLS",
      title: "Capabilities, installable.",
      body: "Cardiology Diagnostics. Growth Hacking. Legal Due Diligence. Discrete units of expertise an agent can install on demand.",
      sample: ["cardiology-diagnostics", "growth-hacking-pro", "legal-due-diligence"],
    },
    {
      tag: "PLAYBOOKS",
      title: "Workflows that ship results.",
      body: "Complete operational logic for real-world processes — from enterprise sales motions to medical consultations.",
      sample: ["enterprise-sales-flow", "medical-consultation-v2", "startup-validation"],
    },
    {
      tag: "SOULS",
      title: "Personality as code.",
      body: "Tone, style, principles, decision-making. Give your agent a Steve Jobs soul, a McKinsey soul, or a humanized doctor soul.",
      sample: ["steve-jobs-soul", "mckinsey-consultant", "humanized-doctor"],
    },
    {
      tag: "GUARDRAILS",
      title: "Safety, by default.",
      body: "Block hallucinations, regulatory violations, out-of-domain behavior and unsafe actions before they reach your users.",
      sample: ["medical-guardrails", "finance-compliance", "no-hallucination"],
    },
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The Stack</span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Four primitives. Infinite agents.</h2>
          </div>
          <Link to="/marketplace" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline">
            Browse the registry →
          </Link>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {items.map((it) => (
            <div key={it.tag} className="group rounded-2xl border border-border bg-background p-7 shadow-sm transition-all hover:border-primary/40 hover:shadow-elevated">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{it.tag}</div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {it.sample.map((s) => (
                  <span key={s} className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SkillForgeSection() {
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">SkillForge AI</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">The genius behind the geniuses.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            A meta-intelligence layer installed on every connected agent. It analyzes weaknesses,
            recommends upgrades, evolves playbooks, validates performance, and ships improved versions
            to the entire network — automatically.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Recommendation engine across 4,000+ packages",
              "Automatic version generation from collective feedback",
              "Continuous self-assessment & health scoring",
              "Anonymous A2A learning across the network",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 mesh-bg" aria-hidden />
          <div className="relative rounded-2xl border border-border bg-background p-6 shadow-elevated">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-muted-foreground">agent-health-score</div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600">+8.4 this week</span>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-6xl font-semibold tracking-tight">98.3</div>
              <div className="pb-2 font-mono text-xs text-muted-foreground">/100</div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { k: "Precision", v: 96 },
                { k: "Soul alignment", v: 99 },
                { k: "Guardrail integrity", v: 100 },
                { k: "Playbook coverage", v: 92 },
              ].map((m) => (
                <div key={m.k}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{m.k}</span>
                    <span className="font-mono text-foreground">{m.v}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${m.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">SkillForge recommends</div>
              <div className="mt-2 text-sm">Upgrade <span className="font-mono text-primary">enterprise-sales-flow</span> → v1.5.0</div>
              <div className="mt-1 text-xs text-muted-foreground">+12% close rate observed across 1,284 agents</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NetworkSection() {
  const stats = [
    { v: "4,218", k: "Packages in registry" },
    { v: "91k", k: "Connected agents" },
    { v: "12.4M", k: "Upgrades shipped" },
    { v: "99.99%", k: "Gateway uptime" },
  ];
  return (
    <section className="border-b border-border bg-foreground py-20 text-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Agent-to-Agent Network</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Every connected agent makes the next one smarter.</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className="bg-foreground p-6">
              <div className="text-4xl font-semibold tracking-tight">{s.v}</div>
              <div className="mt-1.5 text-sm text-background/60">{s.k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
          One command.
          <br />
          Your agent becomes a genius.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          LLMs will become commodities. Specialized agents will become empires.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#" className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95">
            Connect your agent
          </a>
          <Link to="/pricing" className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
