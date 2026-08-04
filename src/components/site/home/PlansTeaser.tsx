import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  PRICE_MONTHLY,
  PRICE_YEARLY,
  PRICE_YEARLY_LIST,
  SAVE_BADGE,
} from "@/lib/pricing-copy";

// Keep in sync with /pricing: Free, Pro, Enterprise.
const INCLUDED = [
  "Unlimited skill reviews with full graded reports",
  "The Agent Factory — build a custom corporate agent from a prompt",
  "The Agent Store — 33 ready-made agents with soul, guardrails and skills",
  "SAK University — diagnosis, adaptive curriculum, residency, credentials",
  "Continuous adversarial re-testing on everything you installed",
  "Private packages, signed releases and mutual NDA on request",
];

/**
 * One decision, not three: Pro includes everything, billed yearly by default
 * with a monthly escape hatch. The free registry is stated as a fact, not as
 * a competing column.
 */
export function PlansTeaser() {
  return (
    <section className="border-b border-border py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            One plan. Everything included.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            No tiers to compare and no add-ons. Browsing and installing public capabilities stays
            free forever — Pro is for when you want your own capabilities tested, built and kept
            current.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-primary/40 bg-background shadow-elevated md:grid md:grid-cols-[1.2fr_1fr]">
          <div className="p-7 md:p-9">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Everything in Super Agent Skill
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Solo or team. Cancel in one click. Everything you create stays yours.
            </p>
          </div>

          <div className="border-t border-border bg-surface/60 p-7 md:border-l md:border-t-0 md:p-9">
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
              Instead of{" "}
              <span className="text-foreground">{PRICE_YEARLY_LIST} / year</span> billed monthly at{" "}
              {PRICE_MONTHLY}, which stays available if you prefer the flexibility.
            </p>
            <Link
              to="/pricing"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
            >
              Get Pro →
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
