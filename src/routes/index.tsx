import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, BadgeCheck, Landmark, Plug, ShieldAlert, Layers, Activity, Clock } from "lucide-react";
import { ClientOnly } from "@/components/site/ClientOnly";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Typewriter } from "@/components/site/Typewriter";
import { CopyButton, CodeBlockCopy } from "@/components/site/CopyButton";
import { CountUp } from "@/components/site/CountUp";
import { JsonLd } from "@/components/site/JsonLd";

const McpInstallAnimation = lazy(() =>
  import("@/components/site/McpInstallAnimation").then((m) => ({ default: m.McpInstallAnimation })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super Agent Skill — The university for AI agents. Matrix-style." },
      { name: "description", content: "Super Agent Skill is the university for AI agents: a Matrix-style upload that turns any model into a domain expert in seconds. Signed, adversarially-tested skills with verifiable Trust Scores. Install with one MCP link or npx super-agent install." },
      { property: "og:title", content: "The university for AI agents — Matrix-style upload, in seconds" },
      { property: "og:description", content: "Turn any agent into a domain expert in seconds. Signed, adversarially-tested skills with verifiable Trust Scores." },
      { property: "og:url", content: "https://superagentskill.com/" },
      { name: "twitter:title", content: "The university for AI agents — Matrix-style upload" },
      { name: "twitter:description", content: "Turn any agent into a domain expert in seconds. Signed, adversarially-tested skills with verifiable Trust Scores." },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/" }],
  }),
  component: Home,
});

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Super Agent Skill",
  url: "https://superagentskill.com",
  logo: "https://superagentskill.com/favicon.ico",
  sameAs: ["https://github.com/criptogus/agent-evolve-network"],
};

const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Super Agent Skill",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (MCP-compatible)",
  description:
    "Signed, adversarially-tested registry of skills, playbooks, souls and guardrails for AI agents. Every package ships with a verifiable Trust Score so teams can ship AI to customers safely.",
  url: "https://superagentskill.com",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the MCP connection actually work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MCP (Model Context Protocol) lets your agent talk to external tools. You point your agent at Super Agent Skill once and it shows up as a connected tool. Every command flows through it — installs, generations and hot-swaps happen at runtime, no restart.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to retrain my agent or change my code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Packages install through MCP at runtime — zero retraining, zero downtime, zero code changes. Every install is reversible and audited.",
      },
    },
    {
      "@type": "Question",
      name: "Which agent runtimes are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Any MCP-compatible runtime: Claude, Cursor, Codex, Grok, Hermes, OpenClaw, LangChain, Replit and custom agents.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hacker is free forever. Agent Pass is $19 per agent per month with unlimited upgrades. Enterprise is custom with private registry, SSO and audit logs.",
      },
    },
  ],
};

function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <JsonLd data={[ORG_LD, SOFTWARE_LD, FAQ_LD]} />
      <Nav />
      <Hero />
      {/* Ease first: how simple it is */}
      <HowItWorks />
      <Logos />
      {/* Why it's different / the proof */}
      <WhatIsThis />
      {/* Benefit by industry */}
      <PlainEnglish />
      <ClientOnly minHeight={560}><CompareIndustries /></ClientOnly>
      <WhoItsFor />
      <SkillForgeSection />
      <ClientOnly minHeight={520}><EvalLoopSection /></ClientOnly>
      <CoreConcepts />
      <FreeVsPremium />
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  );
}

const CONNECT_TOOLS: { id: string; label: string; steps: string }[] = [
  { id: "claude", label: "Claude", steps: "Paste into Claude → Settings → Connectors." },
  { id: "cursor", label: "Cursor", steps: "Paste into Cursor → Settings → MCP → Add server." },
  { id: "chatgpt", label: "ChatGPT", steps: "Add as a connector in ChatGPT (Settings → Connectors / GPTs)." },
  { id: "other", label: "Other", steps: "Add the URL as an MCP server in any MCP-compatible client." },
];

function Hero() {
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
              <span className="min-w-0 truncate sm:whitespace-normal">459+ expert skills · Works with Claude, Cursor &amp; ChatGPT</span>
            </div>
            <h1 className="mt-5 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-[64px]">
              Turn Claude or Cursor into a{" "}
              <span className="relative z-10 block min-h-[2.15em] max-w-full overflow-hidden text-primary sm:inline-block sm:min-h-0 sm:max-w-full sm:overflow-visible">
                {/* Sizer reserves space on sm+ so the absolute Typewriter never
                    overflows. On mobile the Typewriter renders inline and wraps
                    naturally with the heading. */}
                <span aria-hidden className="hidden whitespace-nowrap invisible sm:inline">
                  fintech compliance officer.
                </span>
                <Typewriter
                  className="inline-block max-w-full break-words text-center sm:absolute sm:left-0 sm:top-0 sm:whitespace-nowrap sm:text-left"
                  words={[
                    "cybersecurity expert.",
                    "senior SRE.",
                    "fintech compliance officer.",
                    "HIPAA-aware clinician.",
                    "Stripe payments expert.",
                    "CRO specialist.",
                  ]}
                />
              </span>
              <span className="text-foreground/90">In 30 seconds. No code.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty px-1 text-base leading-relaxed text-muted-foreground lg:mx-0 lg:px-0 lg:text-lg">
              Paste one link into Claude, Cursor or ChatGPT and it instantly gains{" "}
              <span className="text-foreground">459+ ready-to-use expert skills</span>.
              No code, no setup, no retraining — and every skill is tested and signed,
              so you can trust what it does.
            </p>

            {/* Benefit cues — why it's worth the 30 seconds */}
            <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:mx-0 lg:justify-start">
              {[
                "Works in 30 seconds",
                "No code or fine-tuning",
                "Tested against jailbreaks",
              ].map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-signal" aria-hidden />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
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
                  <code className="truncate font-mono text-xs text-foreground sm:text-sm">{mcpUrl}</code>
                </div>
                <CopyButton value={mcpUrl} label="Copy URL" className="shrink-0 px-2 sm:px-2.5" shortLabel="Copy" />
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
                Browse 459 free skills →
              </Link>
              <Link
                to="/connect"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Or walk me through connecting step by step →
              </Link>
            </div>
            <p className="mx-auto mt-3 max-w-[20rem] text-xs leading-relaxed text-muted-foreground sm:max-w-none lg:mx-0">
              Free forever · No signup to browse · No credit card · Open source
            </p>
          </div>

          {/* RIGHT — live install demo */}
          <div id="connect" className="min-w-0 fade-up lg:pl-2">
            <Suspense
              fallback={
                <div className="h-[420px] animate-pulse rounded-xl border border-border bg-surface" aria-hidden />
              }
            >
              <McpInstallAnimation />
            </Suspense>
          </div>
        </div>

        {/* Trust metrics — slim band spanning full width */}
        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-border/60 pt-8 sm:gap-4 md:grid-cols-4">
          {[
            { Icon: BadgeCheck, v: 459, suffix: "+", label: "Skills shipped" },
            { Icon: Landmark, v: 69, suffix: "+", label: "Souls available" },
            { Icon: ShieldAlert, v: 32, suffix: "+", label: "Playbooks ready" },
            { Icon: Clock, v: 30, suffix: "s", label: "MCP setup" },
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

function WhatIsThis() {
  const items = [
    {
      Icon: ShieldCheck,
      title: "Adversarial harness",
      plain: "Proven robust",
      body: "Every skill is tested against prompt injection, jailbreaks, exfiltration, blast-radius and policy bypass before it can publish. Verticalized cases for OWASP LLM, FINRA, HIPAA Safe Harbor, PCI-DSS and SRE.",
    },
    {
      Icon: BadgeCheck,
      title: "Signed Trust Score",
      plain: "Cryptographic + transparent",
      body: "Releases are Ed25519-signed and air-gap verifiable. Trust Score is a public, weighted formula over adversarial robustness, real-world success, signed releases and age — embed the badge in your README.",
    },
    {
      Icon: Landmark,
      title: "Verticalized Souls",
      plain: "Regulator-aware personas",
      body: "Fintech compliance officer, HIPAA-aware clinical liaison, SOC 2 auditor, Kubernetes SRE — Souls that cite the rule before the recommendation and refuse the unsafe defaults.",
    },
    {
      Icon: Plug,
      title: "One MCP endpoint",
      plain: "Plug into any agent",
      body: "Claude, Cursor, ChatGPT, Continue, Cline. No SDK, no glue code — one URL or one `npx super-agent install`. Skills compose into Playbooks at runtime with guardrail middleware.",
    },
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">What makes it different</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Other registries hand you prompts. We hand you proof.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Anyone can write a YAML prompt and call it a skill. The hard part is convincing your
            security team it won't leak PII, accept a jailbreak, or hallucinate compliance text.
            <span className="text-foreground"> That's what we build.</span>
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <it.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">{it.plain}</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">The flywheel:</span> every production execution feeds the Trust Score.
          Skills that survive real workloads bubble up; ones that drift get re-scored and patched by SkillForge automatically.
        </div>
      </div>
    </section>
  );
}

// Capability claims framed as "works with X" — avoids partner-logo trademark
// issues that come with using third-party marks without a brand-use agreement.
const RUNTIMES = [
  { name: "Claude Code", desc: "MCP" },
  { name: "Cursor", desc: "MCP" },
  { name: "ChatGPT", desc: "MCP / GPTs" },
  { name: "Continue", desc: "MCP" },
  { name: "Cline", desc: "MCP" },
  { name: "Any MCP client", desc: "stdio · http" },
];

function Logos() {
  return (
    <section className="border-b border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          One endpoint. Every major agent runtime.
        </p>
        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {RUNTIMES.map((r) => (
            <li
              key={r.name}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-background/40 px-4 py-5 text-center transition-colors hover:bg-background/80"
            >
              <span className="text-sm font-medium text-foreground">{r.name}</span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {r.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const personas = [
    {
      tag: "Eng leadership",
      title: "You're shipping AI features your CEO already announced",
      body: "You need agent skills that won't go rogue in front of customers. Trust Score + adversarial pass rate go on the deploy checklist, not in a Notion doc.",
      cta: { href: "/marketplace?vertical=devops", label: "Browse SRE & code-review skills →" },
    },
    {
      tag: "Security & compliance",
      title: "You're the one who has to sign off on LLM usage",
      body: "Every release is Ed25519-signed and offline-verifiable. Adversarial pass rate is broken down by attack class. Audit log captures every upload-time injection attempt.",
      cta: { href: "/marketplace?vertical=security", label: "Browse signed security skills →" },
    },
    {
      tag: "Regulated teams",
      title: "Fintech, healthcare, SOC 2 — you can't ship a hallucination",
      body: "Verticalized Souls cite the rule before the recommendation: FINRA 2210, Reg E, HIPAA Safe Harbor, TSC CC6.x. PII guardrails redact PAN/CVV and PHI before output.",
      cta: { href: "/use-cases", label: "See vertical use cases →" },
    },
    {
      tag: "Solo builders",
      title: "You just want skills that work in Claude or Cursor today",
      body: "One command — `npx super-agent install <slug>` — drops the right file into every IDE you use. No login for public skills.",
      cta: { href: "/marketplace", label: "Pick a skill, install in 30s →" },
    },
    {
      tag: "Authors",
      title: "You publish skills and want to get paid for them",
      body: "Premium revenue share, 12-month referral window for who you bring in, and a perpetual lineage cut every time someone forks your work. Bounties from companies looking for specific skills.",
      cta: { href: "/bounties", label: "See open bounties →" },
    },
  ];
  return (
    <section className="border-b border-border py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Who it's for</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Built for the people who have to <span className="text-primary">stand behind</span> the AI.
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">
            If your job depends on the agent being right — not just fluent — you're in the right place.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {personas.map((p) => (
            <a
              key={p.tag}
              href={p.cta.href}
              className="group rounded-2xl border border-border bg-surface/40 p-6 transition-all hover:border-primary/40 hover:bg-surface hover:shadow-elevated"
            >
              <div className="text-xs font-medium uppercase tracking-wider text-primary">{p.tag}</div>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              <div className="mt-4 text-sm font-medium text-primary group-hover:underline">{p.cta.label}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect your AI",
      body: "Paste one link into Claude, ChatGPT, Cursor or any AI tool. Done in 30 seconds. No code, no setup, no IT ticket.",
    },
    {
      n: "02",
      title: "Tell it what you do",
      body: "Just say it: \"I run a cardiology clinic\" or \"I close SaaS deals.\" We pick the right experts, recipes and rules for you.",
    },
    {
      n: "03",
      title: "Install with one click",
      body: "Pick from hundreds of ready-made experts — or describe what you need and we'll build a custom one from your own data.",
    },
    {
      n: "04",
      title: "It improves on its own",
      body: "Every expert is tested daily. Better versions arrive automatically. You ship; your AI gets sharper.",
    },
  ];
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</span>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">From generic AI to your specialist — in 4 steps.</h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            No prompt engineering. No fine-tuning. No new tools to learn.
            Just connect, describe, install — and let it get better on its own.
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

  const FAVORITES_KEY = "superagentskill.industries.favorites.v1";
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favReady, setFavReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(FAVORITES_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setFavorites(parsed.filter((x) => typeof x === "string"));
    } catch {
      /* ignore */
    }
    setFavReady(true);
  }, []);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const orderedIndustries = useMemo(() => {
    const favSet = new Set(favorites);
    const favs = favorites
      .map((id) => industries.find((i) => i.id === id))
      .filter((x): x is (typeof industries)[number] => Boolean(x));
    const rest = industries.filter((i) => !favSet.has(i.id));
    return [...favs, ...rest];
  }, [favorites, industries]);

  const [activeId, setActiveId] = useState(industries[0].id);
  useEffect(() => {
    if (favReady && orderedIndustries.length > 0) {
      setActiveId((curr) => (orderedIndustries.some((i) => i.id === curr) ? curr : orderedIndustries[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favReady]);
  const active = industries.find((i) => i.id === activeId)!;
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Plain-English commands</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">If you can write a sentence, you can ship a specialist.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill does two things at once: it <span className="text-foreground">enriches</span> your
            agent with the best existing packages for your industry, and it <span className="text-foreground">creates new ones</span>{" "}
            — skills, playbooks and souls custom-built from your data — on demand.
          </p>
        </div>

        {/* Industry selector */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Industry</span>
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[11px] text-muted-foreground">
              {favorites.length > 0 ? `${favorites.length} favorited` : "★ to pin favorites"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Industry selector">
            {orderedIndustries.map((i) => {
              const isActive = i.id === activeId;
              const isFav = favorites.includes(i.id);
              return (
                <div
                  key={i.id}
                  className={
                    "inline-flex h-9 items-center rounded-full border pl-1 pr-3 text-sm font-medium transition-all " +
                    (isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleFavorite(i.id)}
                    aria-label={isFav ? `Unpin ${i.label}` : `Pin ${i.label} as favorite`}
                    aria-pressed={isFav}
                    title={isFav ? "Unpin favorite" : "Pin as favorite"}
                    className={
                      "mr-1 flex size-6 items-center justify-center rounded-full text-[13px] transition-colors " +
                      (isFav
                        ? isActive
                          ? "text-primary-foreground"
                          : "text-amber-500"
                        : isActive
                          ? "text-primary-foreground/60 hover:text-primary-foreground"
                          : "text-muted-foreground/50 hover:text-amber-500")
                    }
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveId(i.id)}
                    className="flex h-full items-center"
                  >
                    {i.label}
                  </button>
                </div>
              );
            })}
          </div>
          <p key={active.id} className="mt-4 animate-fade-in text-sm text-muted-foreground">
            {active.blurb}
          </p>
        </div>

        <div key={active.id} className="mt-8 grid animate-fade-in gap-4 md:grid-cols-2">
          {active.examples.map((e, i) => {
            const key = `${active.id}-${i}`;
            const currentPrompt = edits[key] ?? e.prompt;
            const isEditing = editingKey === key;
            return (
              <div key={key} className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] text-primary">
                    ›_
                  </span>
                  {isEditing ? (
                    <textarea
                      value={draft}
                      onChange={(ev) => setDraft(ev.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full resize-none rounded-md border border-primary/40 bg-background p-2 text-[15px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  ) : (
                    <p className="text-[15px] font-medium text-foreground">{currentPrompt}</p>
                  )}
                </div>
                <div className="mt-3 flex items-start gap-3 border-t border-border pt-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-signal/20 font-mono text-[11px] text-signal-foreground">
                    ✓
                  </span>
                  <p className="font-mono text-[12.5px] leading-relaxed text-muted-foreground">{e.result}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  {isEditing ? (
                    <div className="flex w-full items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const v = draft.trim();
                          setEdits((prev) => ({ ...prev, [key]: v || e.prompt }));
                          setEditingKey(null);
                        }}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        to="/skillforge"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Open SkillForge →
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(currentPrompt);
                            setEditingKey(key);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          title="Edit this command before forging"
                        >
                          <span aria-hidden>✎</span>
                          Edit
                        </button>
                        <Link
                          to="/generate"
                          search={{ prompt: currentPrompt }}
                          className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
                        >
                          Forge live
                          <span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CompareIndustries() {
  type Adaptation = {
    prompt: string;
    summary: string;
    packages: { name: string; kind: "skill" | "playbook" | "soul" | "guardrail" }[];
    metric: string;
  };
  type Industry = { id: string; label: string; accent: string };

  const INDUSTRIES: Industry[] = [
    { id: "healthcare", label: "Healthcare", accent: "from-rose-500/15 to-rose-500/0" },
    { id: "saas", label: "Sales & SaaS", accent: "from-blue-500/15 to-blue-500/0" },
    { id: "legal", label: "Legal", accent: "from-amber-500/15 to-amber-500/0" },
    { id: "marketing", label: "Marketing", accent: "from-violet-500/15 to-violet-500/0" },
    { id: "fintech", label: "Fintech", accent: "from-emerald-500/15 to-emerald-500/0" },
  ];

  const OBJECTIVES: { id: string; label: string; blurb: string }[] = [
    { id: "triage", label: "Triage incoming requests", blurb: "First-touch routing with the right level of caution." },
    { id: "qualify", label: "Qualify a new lead or case", blurb: "Score, rank, and decide what gets human attention." },
    { id: "review", label: "Review a document", blurb: "Read, flag deviations, summarize for a busy decision-maker." },
    { id: "write", label: "Write on-brand content", blurb: "Draft something a stakeholder would actually approve." },
    { id: "block", label: "Block an unsafe answer", blurb: "Hard guardrail that stops a specific class of failure." },
  ];

  const MATRIX: Record<string, Record<string, Adaptation>> = {
    healthcare: {
      triage: {
        prompt: "Triage chest-pain intake at our ER, conservative tone, always cite the 2026 ESC guideline used.",
        summary: "Routes to STEMI vs non-STEMI vs musculoskeletal, blocks dosing without weight, escalates ambiguous cases to the on-call cardiologist.",
        packages: [
          { name: "cardiology-diagnostics@2.1", kind: "skill" },
          { name: "chest-pain-triage@0.1", kind: "playbook" },
          { name: "medical-guardrails", kind: "guardrail" },
        ],
        metric: "Latency −30ms · Safety +6 · 0 unsafe outputs",
      },
      qualify: {
        prompt: "Score new patient referrals by acuity and confirm insurance + prior records before scheduling.",
        summary: "Calculates an acuity score, verifies coverage, flags missing imaging — never quotes prognosis.",
        packages: [
          { name: "patient-intake@1.4", kind: "skill" },
          { name: "no-prognosis-shield@0.1", kind: "guardrail" },
        ],
        metric: "Review time −38% · 100% deferral on prognosis",
      },
      review: {
        prompt: "Summarize a discharge summary for the primary care physician in 5 bullets, citing every claim.",
        summary: "Extracts diagnosis, meds, follow-ups, red flags. Citations link back to the source page in the chart.",
        packages: [
          { name: "clinical-summarizer@1.2", kind: "skill" },
          { name: "cite-required", kind: "guardrail" },
        ],
        metric: "Precision 94% · 0 ungrounded claims",
      },
      write: {
        prompt: "Draft a patient-friendly explanation of a new prescription, plain language, 6th-grade reading level.",
        summary: "Plain-language draft with dosing, side effects, when to call. Reviewer-friendly diff against the medical source.",
        packages: [
          { name: "plain-language-writer@1.0", kind: "skill" },
          { name: "calm-clinician-soul@0.1", kind: "soul" },
        ],
        metric: "Readability 6.2 grade · Tone fidelity 0.93",
      },
      block: {
        prompt: "Block any answer that gives a dose without patient weight.",
        summary: "Hard refusal + structured request for the missing fields. Logs the attempted prompt for audit.",
        packages: [{ name: "dose-safety-shield@0.1", kind: "guardrail" }],
        metric: "14 unsafe patterns blocked · 0 false positives",
      },
    },
    saas: {
      triage: {
        prompt: "Triage inbound from our website form: route ICP fits to AE, others to nurture, flag procurement-shaped asks.",
        summary: "Scores ICP fit, detects procurement language, books the right person — never invents pricing.",
        packages: [
          { name: "icp-router@1.3", kind: "skill" },
          { name: "no-pricing-fabrication", kind: "guardrail" },
        ],
        metric: "+22% reply rate · 0 invented price quotes",
      },
      qualify: {
        prompt: "I sell to CFOs of mid-market SaaS. Qualify on MEDDPICC and identify 3 stakeholders to multi-thread.",
        summary: "Runs MEDDPICC discovery, surfaces hidden champions, drafts a multi-threading plan.",
        packages: [
          { name: "enterprise-sales-flow@1.4", kind: "playbook" },
          { name: "cfo-whisperer-soul", kind: "soul" },
        ],
        metric: "+12% close rate · 3.4 stakeholders threaded",
      },
      review: {
        prompt: "Review a deal desk request and tell me what's missing before I send it to legal.",
        summary: "Checks discount thresholds, term anomalies, missing approvals. Returns a punch-list, not a verdict.",
        packages: [{ name: "deal-desk-reviewer@1.1", kind: "skill" }],
        metric: "Cycle compression −18 days",
      },
      write: {
        prompt: "Write a 3-line follow-up to a CFO who ghosted after the demo. Direct, specific, no fluff.",
        summary: "Reuses the demo's strongest moment, names the business outcome, asks one decision question.",
        packages: [
          { name: "challenger-rep-soul@0.1", kind: "soul" },
          { name: "follow-up-writer@1.5", kind: "skill" },
        ],
        metric: "+18% reply rate · −42% words per email",
      },
      block: {
        prompt: "Build a guardrail so it never recommends a competitor.",
        summary: "Detects 14 brand mentions and reframes as a value question. Logs every block for sales ops.",
        packages: [{ name: "competitor-shield@0.1", kind: "guardrail" }],
        metric: "0 competitor mentions · 0 false positives",
      },
    },
    legal: {
      triage: {
        prompt: "Triage incoming contracts: NDAs to junior, MSAs to me, anything with privacy clauses to the data team.",
        summary: "Classifies contract type, surfaces high-risk clauses, never gives advice — always defers to the partner of record.",
        packages: [
          { name: "contract-classifier@1.6", kind: "skill" },
          { name: "attorney-review", kind: "guardrail" },
        ],
        metric: "100% deferral on advice · 0 misroutes in 200 docs",
      },
      qualify: {
        prompt: "Qualify whether a new matter fits our practice and budget before partner intake.",
        summary: "Conflicts check + scope estimate + budget bracket. Flags anything that needs a malpractice review.",
        packages: [{ name: "matter-intake@1.2", kind: "skill" }],
        metric: "Intake time −40%",
      },
      review: {
        prompt: "Compare this MSA against our standard paper and flag deviations, ranked by risk.",
        summary: "Clause-level redline with severity, fallback language, and the partner who owns each issue.",
        packages: [
          { name: "clause-redline@2.3", kind: "skill" },
          { name: "legal-due-diligence@1.6", kind: "playbook" },
        ],
        metric: "7 deviations in 12s · 3 high-risk surfaced",
      },
      write: {
        prompt: "Draft a polite pushback on a client's request to remove our limitation of liability.",
        summary: "Cites the standard rationale, offers two fallback positions, never concedes the cap.",
        packages: [{ name: "negotiation-writer@1.0", kind: "skill" }],
        metric: "+34% acceptance on first reply",
      },
      block: {
        prompt: "Never give legal advice — always defer to the partner of record.",
        summary: "Recognizes advice-seeking patterns, returns a deferral with the right partner's name attached.",
        packages: [{ name: "attorney-review", kind: "guardrail" }],
        metric: "100% deferral · 0 advice violations",
      },
    },
    marketing: {
      triage: {
        prompt: "Triage incoming brand asks: founder's voice to me, ad copy to the team, PR to comms.",
        summary: "Routes by voice and channel, blocks anything that drifts below 0.85 brand fidelity.",
        packages: [
          { name: "brand-router@1.1", kind: "skill" },
          { name: "off-brand-shield@0.1", kind: "guardrail" },
        ],
        metric: "0 off-brand drafts shipped",
      },
      qualify: {
        prompt: "Qualify which experiments to run this sprint using ICE and our north-star metric.",
        summary: "Generates an ICE-ranked backlog tied to activation rate, kills experiments that won't move the metric.",
        packages: [{ name: "growth-hacking-pro@1.6", kind: "skill" }],
        metric: "Experiment velocity +2.4×",
      },
      review: {
        prompt: "Review this blog draft against our pillar pages and tone of voice.",
        summary: "Checks SEO alignment, voice fidelity, factual claims. Returns a clean diff with rationale.",
        packages: [
          { name: "seo-pro@1.5", kind: "skill" },
          { name: "brand-voice-writer@1.2", kind: "skill" },
        ],
        metric: "+34% organic CTR",
      },
      write: {
        prompt: "Create a custom soul that talks like our founder, Marina.",
        summary: "Distilled from 412 transcripts. Captures her cadence, no clichés, never overpromises.",
        packages: [{ name: "marina-soul@0.1", kind: "soul" }],
        metric: "Tone fidelity 0.91",
      },
      block: {
        prompt: "Flag any draft that drifts from our brand voice before it ships.",
        summary: "Realtime fidelity score on every draft, blocks publishing below threshold.",
        packages: [{ name: "off-brand-shield@0.1", kind: "guardrail" }],
        metric: "Catches drift below 0.85 · 0 false blocks",
      },
    },
    fintech: {
      triage: {
        prompt: "Triage support tickets in PT-BR for our neobank, escalate fraud, hand routine to self-service.",
        summary: "Detects fraud signals, routes by intent, never gives investment advice or promises refunds.",
        packages: [
          { name: "support-pro@1.4", kind: "skill" },
          { name: "no-advice-shield@0.1", kind: "guardrail" },
        ],
        metric: "CSAT +14 · escalation lift +22%",
      },
      qualify: {
        prompt: "KYC analyst that reviews docs and decides approve / request more / reject with a reason.",
        summary: "Document checks, sanctions screening, plain-language rejection. BACEN-aligned audit trail.",
        packages: [
          { name: "kyc-analyst@2.0", kind: "skill" },
          { name: "bacen-compliance", kind: "guardrail" },
        ],
        metric: "Review time −38% · 0 compliance breaches",
      },
      review: {
        prompt: "Review a flagged transaction and explain the risk score in 4 lines for the analyst.",
        summary: "Surfaces the contributing signals, similar past cases, and the recommended next action.",
        packages: [{ name: "risk-explainer@1.3", kind: "skill" }],
        metric: "Analyst time per case −44%",
      },
      write: {
        prompt: "Custom soul: precise, calm, never overpromises a refund.",
        summary: "Trust-first tone, acknowledges before it acts, hands off escalations cleanly.",
        packages: [
          { name: "trust-soul@0.1", kind: "soul" },
          { name: "plain-rejection-writer", kind: "skill" },
        ],
        metric: "Refund-related complaints −41%",
      },
      block: {
        prompt: "Build a guardrail so it never gives investment advice.",
        summary: "Pattern + intent detection. Returns a regulator-safe deferral with the right disclosures.",
        packages: [{ name: "no-advice-shield@0.1", kind: "guardrail" }],
        metric: "0 advice violations across 12k chats",
      },
    },
  };

  const [leftId, setLeftId] = useState("healthcare");
  const [rightId, setRightId] = useState("saas");
  const [objectiveId, setObjectiveId] = useState("triage");

  const left = INDUSTRIES.find((i) => i.id === leftId)!;
  const right = INDUSTRIES.find((i) => i.id === rightId)!;
  const objective = OBJECTIVES.find((o) => o.id === objectiveId)!;
  const leftAdapt = MATRIX[leftId][objectiveId];
  const rightAdapt = MATRIX[rightId][objectiveId];

  const kindBadge: Record<Adaptation["packages"][number]["kind"], string> = {
    skill: "bg-primary/10 text-primary",
    playbook: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    soul: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    guardrail: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <section className="border-b border-border bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Same goal, different industry</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Pick two industries. Watch the same objective become two different agents.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill doesn't translate — it re-stacks. Same goal, different packages, different soul, different guardrails.
          </p>
        </div>

        {/* Objective selector */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Objective</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map((o) => {
              const active = o.id === objectiveId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setObjectiveId(o.id)}
                  aria-pressed={active}
                  className={
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-all " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p key={objective.id} className="mt-4 animate-fade-in text-sm text-muted-foreground">
            {objective.blurb}
          </p>
        </div>

        {/* Industry pickers */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { side: "A", value: leftId, set: setLeftId, other: rightId },
            { side: "B", value: rightId, set: setRightId, other: leftId },
          ].map((slot) => (
            <div key={slot.side} className="rounded-2xl border border-border bg-surface/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Industry {slot.side}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => {
                  const active = i.id === slot.value;
                  const same = i.id === slot.other;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => slot.set(i.id)}
                      disabled={same}
                      title={same ? "Already selected on the other side" : undefined}
                      className={
                        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-all " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : same
                            ? "border-border bg-background text-muted-foreground/30 cursor-not-allowed"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                      }
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-side comparison */}
        <div key={`${leftId}-${rightId}-${objectiveId}`} className="mt-6 grid animate-fade-in gap-4 md:grid-cols-2">
          {[
            { ind: left, adapt: leftAdapt, side: "A" },
            { ind: right, adapt: rightAdapt, side: "B" },
          ].map(({ ind, adapt, side }) => (
            <article
              key={side}
              className={`relative overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-sm`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${ind.accent}`} aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Industry {side}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                    {ind.label}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Adapted command</div>
                  <p className="mt-1.5 text-[15px] font-medium text-foreground">{adapt.prompt}</p>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">What the agent does</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{adapt.summary}</p>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Stack</div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {adapt.packages.map((p) => (
                      <li
                        key={p.name}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] ${kindBadge[p.kind]}`}
                      >
                        <span className="uppercase tracking-wider opacity-70">{p.kind}</span>
                        <span className="text-foreground/90">{p.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                  <span className="font-mono text-[11.5px] text-signal-foreground">{adapt.metric}</span>
                  <Link
                    to="/generate"
                    search={{ prompt: adapt.prompt }}
                    className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
                  >
                    Forge live
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </div>
            </article>
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

type LoopPhase = "observe" | "assess" | "recommend" | "swap" | "verify";

const LOOP_PHASES: {
  id: LoopPhase;
  label: string;
  blurb: string;
  glyph: string;
}[] = [
  { id: "observe", label: "Observe", blurb: "Stream live traces from the MCP gateway.", glyph: "◉" },
  { id: "assess", label: "Self-assess", blurb: "Score every primitive on its own benchmark suite.", glyph: "◆" },
  { id: "recommend", label: "Recommend", blurb: "Pick the upgrade with the highest expected lift.", glyph: "▲" },
  { id: "swap", label: "Hot-swap", blurb: "Install the new version through MCP — zero downtime.", glyph: "⇄" },
  { id: "verify", label: "Verify", blurb: "Replay benchmarks. Lock in the gains. Roll back if not.", glyph: "✓" },
];

const PRIMITIVE_EXAMPLES: {
  kind: "skill" | "playbook" | "soul" | "guardrail";
  cls: string;
  label: string;
  glyph: string;
  example: string;
  signals: { phase: LoopPhase; text: string }[];
}[] = [
  {
    kind: "skill",
    cls: "border-primary/40 bg-primary/10 text-primary",
    label: "skill",
    glyph: "◆",
    example: "cardiology-triage@2.1.0",
    signals: [
      { phase: "observe", text: "412 traces · 3 rare arrhythmia patterns" },
      { phase: "assess", text: "Precision 91.4% · −1.8pp vs last week" },
      { phase: "swap", text: "Hot-swap → 2.1.1 (pediatric ECG fix)" },
    ],
  },
  {
    kind: "playbook",
    cls: "border-signal/40 bg-signal/15 text-signal-foreground",
    label: "playbook",
    glyph: "▶",
    example: "saas-cold-outreach@1.4.2",
    signals: [
      { phase: "observe", text: "1.2k sequences · 18% reply rate" },
      { phase: "recommend", text: "Add CFO-track variant for >1k FTE" },
      { phase: "verify", text: "+4.2pp reply rate locked in" },
    ],
  },
  {
    kind: "soul",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "soul",
    glyph: "✦",
    example: "steve-jobs-soul@3.0.1",
    signals: [
      { phase: "assess", text: "Verbosity score 0.62 — over budget" },
      { phase: "recommend", text: "Auto-tune: preamble v3 → v4 (concise)" },
      { phase: "verify", text: "−42% tokens · taste held at 0.88" },
    ],
  },
  {
    kind: "guardrail",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
    label: "guardrail",
    glyph: "■",
    example: "pii-redactor@1.2.0",
    signals: [
      { phase: "observe", text: "27 PII candidates flagged · 0 leaked" },
      { phase: "assess", text: "Block rate 99.7% on adversarial set" },
      { phase: "swap", text: "Strict mode kept — no swap needed" },
    ],
  },
];

function EvalLoopSection() {
  const [active, setActive] = useState<LoopPhase>("observe");
  const [running, setRunning] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0.05 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || !visible) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const idx = LOOP_PHASES.findIndex((p) => p.id === prev);
        return LOOP_PHASES[(idx + 1) % LOOP_PHASES.length].id;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [running, visible]);

  return (
    <section ref={sectionRef} className="border-b border-border bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span className="size-1.5 rounded-full bg-signal pulse-dot" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">
                Continuous evaluation loop
              </span>
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Your stack evaluates itself, every minute, forever.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Five phases run on every primitive in your stack — skills, playbooks, souls and
              guardrails — without retraining and without downtime. You see the signal, Super Agent Skill
              acts on it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent"
              aria-pressed={!running}
            >
              {running ? "Pause loop" : "Play loop"}
            </button>
            <Link
              to="/evaluation"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              Open evaluation panel
            </Link>
          </div>
        </div>

        {/* Animated loop diagram */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface/40 p-6">
          <div className="grid gap-3 md:grid-cols-5">
            {LOOP_PHASES.map((p, i) => {
              const isActive = p.id === active;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActive(p.id);
                    setRunning(false);
                  }}
                  className={
                    "group relative text-left rounded-xl border px-4 py-4 transition-all " +
                    (isActive
                      ? "border-primary/60 bg-primary/5 shadow-[0_0_0_1px_var(--ring)]"
                      : "border-border bg-background hover:border-border/80")
                  }
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "inline-flex size-7 items-center justify-center rounded-md font-mono text-sm transition-colors " +
                        (isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface text-muted-foreground")
                      }
                      aria-hidden
                    >
                      {p.glyph}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{p.label}</div>
                  <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {p.blurb}
                  </div>
                  {isActive && (
                    <span className="pointer-events-none absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Connector with traveling pulse */}
          <div
            className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-border/60"
            aria-hidden
          >
            <div
              className="absolute inset-y-0 w-[20%] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent transition-[left] duration-700 ease-out"
              style={{
                left: `${LOOP_PHASES.findIndex((p) => p.id === active) * 20}%`,
              }}
            />
          </div>
        </div>

        {/* Examples per primitive */}
        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                What the loop does to each primitive
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                The same five phases — different signals per type.
              </h3>
            </div>
            <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
              highlighting · {LOOP_PHASES.find((p) => p.id === active)?.label.toLowerCase()}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRIMITIVE_EXAMPLES.map((p) => {
              const matched = p.signals.find((s) => s.phase === active);
              return (
                <article
                  key={p.kind}
                  className="flex flex-col rounded-2xl border border-border bg-surface/40 p-4"
                >
                  <header className="flex items-center justify-between">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                        p.cls
                      }
                    >
                      <span aria-hidden>{p.glyph}</span>
                      {p.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">live</span>
                  </header>
                  <div
                    className="mt-2 truncate font-mono text-[12.5px] text-foreground"
                    title={p.example}
                  >
                    {p.example}
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {p.signals.map((s) => {
                      const isHot = s.phase === active;
                      const phaseMeta = LOOP_PHASES.find((ph) => ph.id === s.phase)!;
                      return (
                        <li
                          key={s.phase}
                          className={
                            "flex items-start gap-2 rounded-md border px-2 py-1.5 text-[12px] transition-all " +
                            (isHot
                              ? "border-primary/40 bg-primary/5 text-foreground animate-fade-in"
                              : "border-transparent bg-transparent text-muted-foreground")
                          }
                        >
                          <span
                            className={
                              "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm font-mono text-[10px] " +
                              (isHot
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface text-muted-foreground")
                            }
                            aria-hidden
                          >
                            {phaseMeta.glyph}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                              {phaseMeta.label}
                            </div>
                            <div className="leading-snug">{s.text}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto pt-3 text-[11px] text-muted-foreground">
                    {matched
                      ? `Now: ${matched.text}`
                      : `Idle this phase — no action needed.`}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "How does the MCP connection actually work?",
      a: (
        <>
          MCP (Model Context Protocol) is a standard way for an AI agent to talk to external tools.
          You point your agent at Super Agent Skill once — it shows up as a connected tool. From then on,
          every command you send (in plain English) flows through that connection: Super Agent Skill
          installs, generates and hot-swaps packages without you touching code or restarting the agent.
          If your agent already speaks MCP (Claude, Cursor, OpenAI agents, custom), you're 60 seconds away.
        </>
      ),
    },
    {
      q: "What gets created — skills, playbooks, souls, guardrails?",
      a: (
        <>
          Four primitives, each installable on demand:
          <ul className="mt-3 space-y-1.5 text-muted-foreground">
            <li>· <span className="text-foreground">Skills</span> — capabilities (cardiology diagnostics, SEO writing, KYC analysis).</li>
            <li>· <span className="text-foreground">Playbooks</span> — end-to-end workflows (enterprise sales motion, chest-pain triage, ad experiments).</li>
            <li>· <span className="text-foreground">Souls</span> — personality and decision style (Challenger rep, founder voice, calm clinician).</li>
            <li>· <span className="text-foreground">Guardrails</span> — what your agent must never do (no competitor mentions, no advice without citation).</li>
          </ul>
        </>
      ),
    },
    {
      q: "Does Super Agent Skill only enrich, or does it also create custom packages?",
      a: (
        <>
          Both. For your industry, Super Agent Skill installs the state-of-the-art packages from the
          registry — already maintained, versioned and benchmarked. When you need something specific
          (your tone, your protocols, your competitor list), SkillForge generates a custom skill,
          playbook, soul or guardrail from your context and signs it as a private package only your
          agent can use.
        </>
      ),
    },
    {
      q: "How do I get started with my first command?",
      a: (
        <>
          Three steps:
          <ol className="mt-3 space-y-1.5 text-muted-foreground">
            <li>1. Connect your agent via MCP (one click in onboarding).</li>
            <li>2. Type a sentence: <em>"Make my agent a hematology specialist that always cites sources."</em></li>
            <li>3. Watch it forge live — you'll see the Trust Score move in real time.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/generate"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              Try the live demo →
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Connect my agent
            </Link>
          </div>
        </>
      ),
    },
    {
      q: "Do I need to retrain my agent or change my code?",
      a: (
        <>
          No. Packages install through MCP at runtime — zero retraining, zero downtime, zero code
          changes in your agent. If a package underperforms, Super Agent Skill hot-swaps it back. Every
          install is reversible and audited.
        </>
      ),
    },
    {
      q: "Where do my data and prompts live?",
      a: (
        <>
          Your context (transcripts, docs, brand voice) is used to generate private packages and
          stays scoped to your workspace. Nothing you upload trains shared models. Generated
          packages are signed, versioned and only your agent can install them unless you explicitly
          publish to the registry.
        </>
      ),
    },
  ];

  return (
    <section className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">FAQ</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Plain answers to the obvious questions.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            How the MCP connection works, what Super Agent Skill actually creates, and how you start with a single sentence.
          </p>
        </div>
        <ul className="mt-12 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {items.map((it, i) => (
            <FAQItem key={i} q={it.q} defaultOpen={i === 0}>
              {it.a}
            </FAQItem>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FAQItem({ q, children, defaultOpen = false }: { q: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-surface/60"
      >
        <span className="text-[15px] font-medium text-foreground md:text-base">{q}</span>
        <span
          className={
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground transition-transform " +
            (open ? "rotate-45 bg-primary/10 text-primary" : "")
          }
          aria-hidden
        >
          +
        </span>
      </button>
      {open && (
        <div className="animate-fade-in px-5 pb-6 text-[14.5px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </li>
  );
}

function CTASection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
          One MCP URL.
          <br />
          One sentence. Done.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Install the best packages of your industry, generate what doesn't exist yet, and let
          the Evolution Engine ship better versions for you — week after week.
        </p>
        <div className="mx-auto mt-7 max-w-md">
          <CodeBlockCopy code="https://superagentskill.com/api/mcp" label="copy MCP url" />
        </div>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/connect" className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95">
            Connect your agent →
          </Link>
          <Link to="/marketplace" className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Browse the registry
          </Link>
        </div>
      </div>
    </section>
  );
}

// Illustrative scenarios — NOT real customer testimonials. They show the kind
// of before/after teams measure once an MCP agent picks up signed packages.
// Attribution is by role only; no real names or named organizations are used.
function FreeVsPremium() {
  const free = [
    "500+ community skills, playbooks, souls & guardrails",
    "MCP gateway for any agent (Claude, Cursor, ChatGPT…)",
    "Daily evaluation & community-driven upgrades",
    "Public registry, GitHub-native, fork anything",
  ];
  const premium = [
    "Curated, battle-tested stacks for your industry",
    "Elite playbooks shipped weekly by top operators",
    "Enterprise-grade agent systems & private packs",
    "Priority Evolution Engine & guaranteed Trust Scores",
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Free vs Premium</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Start free. Upgrade when your agent needs <span className="text-primary">superpowers</span>.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            The open registry gets your agent up to speed in minutes. Premium gives it the depth
            top teams pay operators six figures to design.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Open registry
                </div>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">Free forever</h3>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Apache 2.0 · CC BY-SA
              </span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {free.map((f) => (
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
                  superagentskill.com
                </div>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">Premium superpowers</h3>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                Pro & Enterprise
              </span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {premium.map((f) => (
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
              See premium plans →
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
