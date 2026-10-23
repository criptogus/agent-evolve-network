import { Link } from "@tanstack/react-router";

/**
 * Founder letter: first-person thesis, signed. Only verifiable claims —
 * anything directional is phrased as what we measure, not as a promise.
 */
export function FounderLetter() {
  return (
    <section className="border-b border-border bg-surface/40 py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          An open letter from the founder
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Skills are systems, not prompts.
        </h2>

        <div className="mt-7 space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            When an agent underperforms, the reflex is to reach for a bigger model or start
            fine-tuning. In most of the cases we see, neither is what was missing. What was missing
            was structure: a capability with explicit boundaries, a defined output contract, and
            guardrails that hold when someone tries to talk the agent out of them.
          </p>
          <p>
            The uncomfortable part is that almost nobody tests that structure. People write a
            SKILL.md once, paste it into their agent, and ship. There is no score, no version
            history, no adversarial pass — so when quality drops, there is nothing to compare
            against and nothing to roll back to.
          </p>
          <p>
            <span className="text-foreground">
              Super Agent Skill exists to turn that into evidence.
            </span>{" "}
            Every capability that enters the registry is graded on format and substance separately,
            run against adversarial cases, repaired where it fails, and re-scored. Each attempt is
            kept as a version with its delta. Only the version that passes gets published — and the
            score travels with it, so anyone installing it can see what it was measured on.
          </p>
          <p>
            That is also how we build agents. You describe the role; the factory assembles the soul,
            the guardrails and the skills, then puts the whole thing through the same lab before you
            can download it.
          </p>
          <p>
            Capabilities are the most underused layer of the AI stack. Tested capabilities are rarer
            still. That is the layer we are building, in the open, with the scores published.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <div>
            <div className="text-sm font-semibold text-foreground">Gustavo Caetano</div>
            <div className="text-xs text-muted-foreground">
              Founder · superagentskill.com ·{" "}
              <a
                href="https://x.com/gustavocaetano"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted hover:text-foreground"
              >
                @gustavocaetano
              </a>
            </div>
          </div>
          <Link
            to="/how-it-works"
            className="text-sm font-medium text-primary hover:underline"
          >
            How the scoring works →
          </Link>
        </div>
      </div>
    </section>
  );
}
