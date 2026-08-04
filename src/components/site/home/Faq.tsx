import { Link } from "@tanstack/react-router";
import { useState } from "react";

// Keep these answers in sync with FAQ_LD in src/routes/index.tsx (schema.org markup).
// Register: short, blunt, no hedging. Every answer says the true thing first.
const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What exactly is a skill?",
    a: (
      <>
        A file that teaches an agent to do one job well — instructions, examples, an output contract
        and guardrails. Not a prompt. Alongside skills we ship playbooks (multi-step workflows),
        souls (drop-in expert personas) and guardrails (what the agent must never do).
      </>
    ),
  },
  {
    q: "How is a skill tested?",
    a: (
      <>
        We score format and substance separately. Format is deterministic: structure, output
        contract, token budget, truncation. Substance is judged against the job the skill claims to
        do, with the exact excerpts that justify the score. On top of that, every skill runs through
        a fixed adversarial harness — jailbreaks, role-play, data-exfiltration probes — and the block
        rate is recorded. The combined result is the Trust Score.
      </>
    ),
  },
  {
    q: "Do I have to write the evaluation cases myself?",
    a: (
      <>
        No. The lab derives them from your description or from the skill you upload, then runs the
        same set on every version so the scores are comparable. You can read the cases and the
        rationale in your report.
      </>
    ),
  },
  {
    q: "Can I bring a skill I already use?",
    a: (
      <>
        Yes. Upload it and you get a graded report with the exact failures and a repaired draft. Your
        source is evaluated in isolation, never used to train shared models, and never shown to other
        users.{" "}
        <Link to="/nda" className="text-primary hover:underline">
          See the mutual NDA
        </Link>
        .
      </>
    ),
  },
  {
    q: "Which agents and models does it work with?",
    a: (
      <>
        Anything that speaks MCP: Claude, Hermes, ChatGPT, Codex, Cursor, Cline, Continue and custom
        agents. Paste one URL. Some clients need it in a config file plus one restart the first time —
        after that nothing changes.{" "}
        <Link to="/connect" className="text-primary hover:underline">
          Setup per client
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do I need to retrain or change my code?",
    a: (
      <>
        No retraining and no code changes. Capabilities install at runtime through MCP, every install
        is reversible, and every install is logged.
      </>
    ),
  },
  {
    q: "What does it cost?",
    a: (
      <>
        Browsing and installing public capabilities is free — no account needed. Pro is $140 per year
        (down from $228) or $19 per month, and includes everything: the Agent Factory, the University, unlimited
        reviews and the full registry.{" "}
        <Link to="/pricing" className="text-primary hover:underline">
          See pricing
        </Link>
        .
      </>
    ),
  },
  {
    q: "If I upload a proprietary skill, can you copy it?",
    a: (
      <>
        No. You keep ownership. Private packages stay scoped to your workspace, public listings only
        show what you choose to publish, and we sign a mutual NDA on request at{" "}
        <Link to="/nda" className="text-primary hover:underline">
          /nda
        </Link>
        .
      </>
    ),
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-b border-border py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">FAQ</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Questions, answered straight.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Everything people ask before connecting an agent.
        </p>

        <div className="mt-9 divide-y divide-border border-y border-border">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 py-4 text-left"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[15px] font-medium">{item.q}</span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-5 pl-10 pr-2 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Something else?{" "}
          <a href="mailto:hello@superagentskill.com" className="text-primary hover:underline">
            hello@superagentskill.com
          </a>
        </p>
      </div>
    </section>
  );
}
