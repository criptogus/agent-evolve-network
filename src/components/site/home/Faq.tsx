import { Link } from "@tanstack/react-router";
import { useState } from "react";

// Keep these answers in sync with FAQ_LD in src/routes/index.tsx (schema.org markup).
export function Faq() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "How does the MCP connection actually work?",
      a: (
        <>
          MCP (Model Context Protocol) is a standard way for an AI agent to talk to external tools.
          You point your agent at Super Agent Skill once — it shows up as a connected tool. From
          then on, every command you send (in plain English) flows through that connection: Super
          Agent Skill installs, generates and hot-swaps packages without you touching code or
          restarting the agent. If your agent already speaks MCP (Claude, Cursor, OpenAI agents,
          custom), you're 60 seconds away.
        </>
      ),
    },
    {
      q: "What gets created — skills, playbooks, souls, guardrails?",
      a: (
        <>
          Four primitives, each installable on demand:
          <ul className="mt-3 space-y-1.5 text-muted-foreground">
            <li>
              · <span className="text-foreground">Skills</span> — capabilities (cardiology
              diagnostics, SEO writing, KYC analysis).
            </li>
            <li>
              · <span className="text-foreground">Playbooks</span> — end-to-end workflows
              (enterprise sales motion, chest-pain triage, ad experiments).
            </li>
            <li>
              · <span className="text-foreground">Souls</span> — personality and decision style
              (Challenger rep, founder voice, calm clinician).
            </li>
            <li>
              · <span className="text-foreground">Guardrails</span> — what your agent must never do
              (no competitor mentions, no advice without citation).
            </li>
          </ul>
        </>
      ),
    },
    {
      q: "Does Super Agent Skill only install, or does it also create custom packages?",
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
            <li>1. Connect your agent via MCP (one click in the connect flow).</li>
            <li>
              2. Type a sentence:{" "}
              <em>"Make my agent a hematology specialist that always cites sources."</em>
            </li>
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
              to="/connect"
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
          changes in your agent. If a package underperforms, Super Agent Skill hot-swaps it back.
          Every install is reversible and audited.
        </>
      ),
    },
    {
      q: "How much does it cost?",
      a: (
        <>
          Hacker is free forever — browse and install from the public registry, no credit card.
          Agent Pass is $19 per agent per month with unlimited upgrades and SkillForge included.
          Enterprise is custom, with private registry, SSO and audit logs.{" "}
          <Link to="/pricing" className="text-primary hover:underline">
            See pricing →
          </Link>
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
            How the MCP connection works, what Super Agent Skill actually creates, and how you start
            with a single sentence.
          </p>
        </div>
        <ul className="mt-12 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {items.map((it, i) => (
            <FaqItem key={i} q={it.q} defaultOpen={i === 0}>
              {it.a}
            </FaqItem>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqItem({
  q,
  children,
  defaultOpen = false,
}: {
  q: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
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
