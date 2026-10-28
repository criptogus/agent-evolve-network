import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  PRICE_AGENT_PASS,
  PRICE_MONTHLY,
  PRICE_YEARLY,
  PRICE_YEARLY_LIST,
  SAVE_BADGE,
} from "@/lib/pricing-copy";

const PRO_INCLUDED = [
  "Agent Factory, Agent Store and SAK University",
  "Unlimited skill reviews with full graded reports",
  "Adversarial evaluation tools and version-specific reports",
];

const AGENT_PASS_INCLUDED = [
  "Unlimited upgrades per production agent",
  "SkillForge AI and weekly report per seat",
];

/**
 * Landing teaser: Free + Pro + Agent Pass, with Enterprise as a footnote.
 * Keep amounts in sync with /pricing via pricing-copy.
 */
export function PlansTeaser() {
  return (
    <section className="border-b border-border py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Free, Pro, and Agent Pass.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Public capabilities stay free forever. Pro is the human builder seat. Agent Pass is each
            production agent seat.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-primary/40 bg-background shadow-elevated p-7 md:p-9">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Pro · billed yearly
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="pb-2 text-2xl font-medium text-muted-foreground line-through">
                {PRICE_YEARLY_LIST}
              </span>
              <span className="text-5xl font-semibold tracking-tight">{PRICE_YEARLY}</span>
              <span className="pb-2 text-sm text-muted-foreground">/ year</span>
            </div>
            <div className="mt-3 inline-flex items-center rounded-full border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
              {SAVE_BADGE}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Or {PRICE_MONTHLY}/month. Human seat: Factory, Store, University, unlimited reviews.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {PRO_INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
            >
              Get Pro →
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background p-7 md:p-9">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Agent Pass · per agent
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-tight">{PRICE_AGENT_PASS}</span>
              <span className="pb-2 text-sm text-muted-foreground">/ agent / month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Each production agent seat: upgrades, SkillForge and a weekly report.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {AGENT_PASS_INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Get Agent Pass →
            </Link>
            <Link
              to="/marketplace"
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-accent"
            >
              Browse the free registry
            </Link>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Need a private registry, SSO or audit logs?{" "}
              <Link to="/enterprise" className="underline decoration-dotted hover:text-foreground">
                Enterprise
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
