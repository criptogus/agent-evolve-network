import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
      <PlainEnglish />
      <CoreConcepts />
      <SkillForgeSection />
      <SocialProof />
      <NetworkSection />
      <FAQ />
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
            One sentence.
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
            AgentForge is the living OS for AI agents. Connect Claude, Cursor, Codex or Grok and,
            in plain English, install state-of-the-art skills, playbooks, souls and guardrails for
            your industry — or generate brand-new ones, made just for you.
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
    {
      n: "01",
      title: "Connect in 30 seconds",
      body: "One MCP handshake links your agent to AgentForge. No SDKs, no retraining, no DevOps. Works with Claude, Cursor, Codex, Grok and any MCP-compatible runtime.",
    },
    {
      n: "02",
      title: "Tell it what you do",
      body: "In plain English: \"I run a cardiology clinic\" or \"I close enterprise SaaS deals.\" AgentForge maps your domain and picks the state-of-the-art skills, playbooks, souls and guardrails for it.",
    },
    {
      n: "03",
      title: "Install — or generate — on command",
      body: "Pre-built packages install instantly. Need something unique? Say \"create a soul that negotiates like our top rep\" and SkillForge generates a custom skill, playbook or soul tailored to your data.",
    },
    {
      n: "04",
      title: "Evolves while you sleep",
      body: "Every interaction feeds the loop. Better versions ship automatically, guardrails tighten, and your agent's Health Score climbs — without anyone touching a config file.",
    },
  ];
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Powerful underneath. Stupidly simple to use.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No prompt engineering. No fine-tuning pipelines. Just talk to your agent like a teammate
            and AgentForge handles the rest — from discovery to installation to continuous evolution.
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

function PlainEnglish() {
  const industries: {
    id: string;
    label: string;
    blurb: string;
    examples: { prompt: string; result: string }[];
  }[] = [
    {
      id: "healthcare",
      label: "Healthcare",
      blurb: "Clinical-grade specialists with citation-required guardrails.",
      examples: [
        {
          prompt: "Make my agent a cardiologist trained on the latest 2026 ESC guidelines.",
          result: "Installed cardiology-diagnostics@2.1 + medical-guardrails. Health +6.4.",
        },
        {
          prompt: "Hematology specialist for a São Paulo clinic, conservative tone, always cite sources.",
          result: "Installed hematology-specialist@1.3 + cite-required guardrail. Safety +5.6.",
        },
        {
          prompt: "Build a triage flow for chest-pain intake at our ER.",
          result: "Generated chest-pain-triage@0.1 from your last 30 protocols. Latency −30ms.",
        },
        {
          prompt: "Block any answer that gives a dose without patient weight.",
          result: "Generated dose-safety-shield@0.1. 14 unsafe patterns blocked, 0 false positives.",
        },
      ],
    },
    {
      id: "saas",
      label: "Sales & SaaS",
      blurb: "Revenue agents that prospect, qualify and close in your stack.",
      examples: [
        {
          prompt: "I sell to CFOs of mid-market SaaS. Give it the right playbook.",
          result: "Installed enterprise-sales-flow + cfo-whisperer soul. +12% close rate.",
        },
        {
          prompt: "Make my agent an SDR: prospect on LinkedIn, qualify, book demos in HubSpot.",
          result: "Installed linkedin-prospecting@1.2 + hubspot-sync. +18% reply rate.",
        },
        {
          prompt: "Create a custom soul that sounds like a Challenger rep, not a script reader.",
          result: "Generated challenger-rep-soul@0.1 from 240 of your won-deal calls.",
        },
        {
          prompt: "Build a guardrail so it never recommends a competitor.",
          result: "Generated competitor-shield@0.1. Blocks 14 brand mentions, 0 false positives.",
        },
      ],
    },
    {
      id: "legal",
      label: "Legal",
      blurb: "Junior associates that triage contracts with privilege protection.",
      examples: [
        {
          prompt: "Make my agent a junior associate that reviews NDAs and MSAs.",
          result: "Installed legal-due-diligence@1.6 + legal-compliance. Precision +5.0.",
        },
        {
          prompt: "Custom playbook for our M&A deal-room prep, modeled on the last 30 closings.",
          result: "Generated deal-room-prep@0.1. 11-step checklist + memo template.",
        },
        {
          prompt: "Never give legal advice — always defer to the partner of record.",
          result: "Installed attorney-review guardrail. 100% deferral on advice queries.",
        },
        {
          prompt: "Compare this MSA against our standard paper and flag deviations.",
          result: "Installed clause-redline@2.3. Found 7 deviations in 12s, 3 high-risk.",
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing & Brand",
      blurb: "On-voice writers, ad operators and brand-safety guardrails.",
      examples: [
        {
          prompt: "Create a custom soul that talks like our founder, Marina.",
          result: "Generated marina-soul@0.1 from 412 of her transcripts. Tone fidelity 0.91.",
        },
        {
          prompt: "Run our Google Ads + Meta Ads with weekly experiments and budget rebalancing.",
          result: "Installed google-ads-pilot + meta-ads-pilot. +2.4× experiment velocity.",
        },
        {
          prompt: "SEO + blog writing tuned to our pillar pages and tone of voice.",
          result: "Installed seo-pro@1.5 + brand-voice-writer@1.2. +34% organic CTR.",
        },
        {
          prompt: "Flag any draft that drifts from our brand voice before it ships.",
          result: "Generated off-brand-shield@0.1. Catches drift below 0.85 fidelity.",
        },
      ],
    },
    {
      id: "fintech",
      label: "Fintech",
      blurb: "Compliance-first agents for support, KYC and risk ops.",
      examples: [
        {
          prompt: "Customer-support agent for a Brazilian neobank, in PT-BR, escalates fraud cases.",
          result: "Installed support-pro + bacen-compliance. CSAT +14, escalation lift +22%.",
        },
        {
          prompt: "KYC analyst that reviews docs and explains rejections in plain language.",
          result: "Installed kyc-analyst@2.0 + plain-rejection-writer. Review time −38%.",
        },
        {
          prompt: "Build a guardrail so it never gives investment advice.",
          result: "Generated no-advice-shield@0.1. 0 advice violations across 12k chats.",
        },
        {
          prompt: "Custom soul: precise, calm, never overpromises a refund.",
          result: "Generated trust-soul@0.1. Refund-related complaints −41%.",
        },
      ],
    },
  ];

  const [activeId, setActiveId] = useState(industries[0].id);
  const active = industries.find((i) => i.id === activeId)!;

  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Plain-English commands</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">If you can write a sentence, you can ship a specialist.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            AgentForge does two things at once: it <span className="text-foreground">enriches</span> your
            agent with the best existing packages for your industry, and it <span className="text-foreground">creates new ones</span>{" "}
            — skills, playbooks and souls custom-built from your data — on demand.
          </p>
        </div>

        {/* Industry selector */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Industry</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Industry selector">
            {industries.map((i) => {
              const isActive = i.id === activeId;
              return (
                <button
                  key={i.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(i.id)}
                  className={
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-all " +
                    (isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {i.label}
                </button>
              );
            })}
          </div>
          <p key={active.id} className="mt-4 animate-fade-in text-sm text-muted-foreground">
            {active.blurb}
          </p>
        </div>

        <div key={active.id} className="mt-8 grid animate-fade-in gap-4 md:grid-cols-2">
          {active.examples.map((e, i) => (
            <div key={`${active.id}-${i}`} className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] text-primary">
                  ›_
                </span>
                <p className="text-[15px] font-medium text-foreground">{e.prompt}</p>
              </div>
              <div className="mt-3 flex items-start gap-3 border-t border-border pt-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-signal/20 font-mono text-[11px] text-signal-foreground">
                  ✓
                </span>
                <p className="font-mono text-[12.5px] leading-relaxed text-muted-foreground">{e.result}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <Link
                  to="/evolution"
                  search={{ prompt: e.prompt }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Watch evolve →
                </Link>
                <Link
                  to="/generate"
                  search={{ prompt: e.prompt }}
                  className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
                >
                  Forge live
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
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
          One sentence.
          <br />
          Your agent becomes a genius.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Install the best of your industry. Generate what doesn't exist yet. All from a chat box —
          no engineers required.
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

const CASES = [
  {
    industry: "Cardiology",
    company: "Mayo-affiliated clinic",
    quote:
      "We connected our triage agent on a Friday. By Monday it was catching arrhythmias our residents missed.",
    person: "Dr. Helena Vasquez",
    role: "Chief of Cardiology",
    before: { label: "Diagnostic precision", value: "78%" },
    after: { label: "Diagnostic precision", value: "94%" },
    delta: "+16pp",
    stack: ["cardiology-diagnostics", "medical-guardrails", "humanized-doctor"],
  },
  {
    industry: "Enterprise SaaS",
    company: "Series C, $40M ARR",
    quote:
      "One sentence — \"sell to CFOs of mid-market SaaS\" — and our SDR agent stopped sounding like a chatbot.",
    person: "Marcus Reilly",
    role: "VP of Revenue",
    before: { label: "Reply rate", value: "4.1%" },
    after: { label: "Reply rate", value: "11.7%" },
    delta: "+2.8×",
    stack: ["enterprise-sales-flow", "mckinsey-consultant"],
  },
  {
    industry: "Legal",
    company: "Top-50 international firm",
    quote:
      "The custom soul we generated from our partners' memos passed blind review against junior associates.",
    person: "Aiko Tanaka",
    role: "Head of Knowledge",
    before: { label: "Memo turnaround", value: "6.2h" },
    after: { label: "Memo turnaround", value: "0.4h" },
    delta: "−15×",
    stack: ["legal-due-diligence", "tanaka-firm-soul", "no-hallucination"],
  },
];

const QUOTES = [
  {
    quote:
      "We tried fine-tuning for 6 months and got nowhere. AgentForge took an afternoon and outperformed it.",
    person: "Priya N.",
    role: "Head of AI · fintech unicorn",
  },
  {
    quote:
      "The Health Score is the first metric our CTO actually trusts about an agent.",
    person: "Diego M.",
    role: "Director of Engineering · logistics",
  },
  {
    quote:
      "It generated a soul from 200 of our top rep's calls. New hires now sound like her on day one.",
    person: "Anna K.",
    role: "VP Sales · B2B SaaS",
  },
  {
    quote:
      "Zero downtime hot-swap is not marketing. We rolled out 4 upgrades during business hours last week.",
    person: "Thomas L.",
    role: "Platform Lead · healthcare",
  },
];

function SocialProof() {
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Proof, not promises
          </span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Before. After. Measured.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real teams. Real metrics. Numbers logged by AgentForge during the first 30 days
            after connecting an MCP-compatible agent.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CASES.map((c) => (
            <article
              key={c.company}
              className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.industry}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{c.company}</span>
              </div>

              {/* Before / After bar */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface/60 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Before
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold tracking-tight text-muted-foreground line-through decoration-muted-foreground/40">
                    {c.before.value}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{c.before.label}</div>
                </div>
                <div className="relative rounded-lg border border-signal/40 bg-signal/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-signal-foreground">
                      After
                    </div>
                    <span className="rounded-full bg-signal px-1.5 py-0.5 font-mono text-[10px] font-semibold text-signal-foreground">
                      {c.delta}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                    {c.after.value}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{c.after.label}</div>
                </div>
              </div>

              <p className="mt-5 text-[15px] leading-relaxed text-foreground/90">
                <span className="text-primary">"</span>
                {c.quote}
                <span className="text-primary">"</span>
              </p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {c.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-3 pt-5">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-signal/30 font-mono text-xs font-semibold">
                  {c.person
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{c.person}</div>
                  <div className="text-xs text-muted-foreground">{c.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Short-form testimonials */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {QUOTES.map((q) => (
            <figure
              key={q.person}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                "{q.quote}"
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2 text-xs">
                <span className="size-1.5 rounded-full bg-signal" />
                <span className="font-medium">{q.person}</span>
                <span className="text-muted-foreground">· {q.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
