import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@/components/site/ClientOnly";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Typewriter } from "@/components/site/Typewriter";
import { CodeBlockCopy } from "@/components/site/CopyButton";
import { CountUp } from "@/components/site/CountUp";
import { JsonLd } from "@/components/site/JsonLd";

const McpInstallAnimation = lazy(() =>
  import("@/components/site/McpInstallAnimation").then((m) => ({ default: m.McpInstallAnimation })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super Agent Skill — Turn your AI into an expert at your job" },
      { name: "description", content: "The app store for your AI's brain. One click installs an expert in your field — works with ChatGPT, Claude, Cursor, Codex." },
      { property: "og:title", content: "Turn your AI into an expert at your job — Super Agent Skill" },
      { property: "og:description", content: "The app store for your AI's brain. One click installs an expert in your field." },
      { property: "og:url", content: "https://superagentskill.com/" },
      { name: "twitter:title", content: "Turn your AI into an expert at your job — Super Agent Skill" },
      { name: "twitter:description", content: "The app store for your AI's brain. One click installs an expert in your field." },
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
    "MCP gateway and registry of skills, playbooks, souls and guardrails for AI agents. Continuously evolves connected agents.",
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
    <div className="min-h-screen bg-background">
      <JsonLd data={[ORG_LD, SOFTWARE_LD, FAQ_LD]} />
      <Nav />
      <Hero />
      <SkillLayerManifesto />
      <WhatIsThis />
      <Logos />
      <HowItWorks />
      <PlainEnglish />
      <ClientOnly minHeight={900}><CompareIndustries /></ClientOnly>
      <CoreConcepts />
      <SkillForgeSection />
      <ClientOnly minHeight={700}><EvalLoopSection /></ClientOnly>
      <SocialProof />
      <FreeVsPremium />
      <ClientOnly minHeight={500}><NetworkSection /></ClientOnly>
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center fade-up">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
            <span>For ChatGPT, Claude, Cursor, Codex & Grok users</span>
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-7xl">
            Turn your AI into
            <br />
            <span className="text-primary">
              an expert at&nbsp;
              <span className="relative inline-block align-baseline">
                <span aria-hidden className="invisible whitespace-nowrap">
                  your job.
                </span>
                <Typewriter
                  className="absolute left-0 top-0 whitespace-nowrap text-foreground"
                  words={["your job.", "cardiology.", "closing deals.", "contracts.", "your brand."]}
                />
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Generic AI gives generic answers. We give your AI the same
            <span className="text-foreground"> instructions, examples and rules </span>
            an expert in your field would use — so it stops guessing and starts
            doing the job the way <span className="text-foreground">you</span> would.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Set it up in one click. No coding. No retraining. Works with the AI tools you already use.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/connect"
              className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
            >
              Get started — it's free →
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex h-12 items-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Browse what's inside
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card · Setup in 30 seconds · 4,200+ ready-to-use experts
          </p>
          <p className="mx-auto mt-6 max-w-md text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Models are commodities. <span className="text-foreground/80">Skills are the new moat.</span>
          </p>
        </div>

        <div id="connect" className="mx-auto mt-16 max-w-3xl fade-up">
          <Suspense
            fallback={
              <div className="h-[420px] animate-pulse rounded-xl border border-border bg-surface" aria-hidden />
            }
          >
            <McpInstallAnimation />
          </Suspense>
        </div>

        {/* Trust metrics */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { v: 4218, suffix: "+", label: "Ready-made experts" },
            { v: 91, suffix: "k", label: "AIs already upgraded" },
            { v: 30, suffix: "s", label: "Avg. setup time" },
            { v: 99.99, decimals: 2, suffix: "%", label: "Uptime" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-surface/60 p-4 text-center">
              <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                <CountUp to={m.v} suffix={m.suffix} decimals={m.decimals ?? 0} />
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
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
      icon: "🧠",
      title: "Skills",
      plain: "Knowledge packs",
      body: "Like hiring a specialist — your AI gets the exact know-how to do one thing really well (review code, write SQL, triage a patient).",
    },
    {
      icon: "📘",
      title: "Playbooks",
      plain: "Step-by-step recipes",
      body: "Repeatable workflows your AI follows from start to finish. Think SOPs, but the AI actually executes them.",
    },
    {
      icon: "🎭",
      title: "Souls",
      plain: "Personality & tone",
      body: "Make the AI sound like your brand, your founder, or your top sales rep — consistently, every time.",
    },
    {
      icon: "🛡",
      title: "Guardrails",
      plain: "Safety rules",
      body: "Hard rules the AI cannot break: never give medical advice, never quote a competitor, never share customer data.",
    },
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">In plain English</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Think of it like an app store for your AI's brain.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Your AI is smart but generic. We give you a library of small, focused
            <span className="text-foreground"> "upgrades" </span>
            you install with one click — and your AI instantly becomes an expert in whatever you do.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="text-3xl">{it.icon}</div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">{it.plain}</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">The best part:</span> they keep getting better automatically.
          Every upgrade is tested daily and improved by the community — so your AI gets smarter while you sleep.
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
      body: "Pick from 4,200+ ready-made experts — or describe what you need and we'll build a custom one from your own data.",
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
            <li>3. Watch it forge live — you'll see the Health Score move in real time.</li>
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
      "We tried fine-tuning for 6 months and got nowhere. Super Agent Skill took an afternoon and outperformed it.",
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
            Real teams. Real metrics. Numbers logged by Super Agent Skill during the first 30 days
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
