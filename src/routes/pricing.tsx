import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  PRICE_MONTHLY,
  PRICE_YEARLY,
  PRICE_YEARLY_LIST,
  PRO_YEARLY_DISCOUNT_PCT,
  SAVE_BADGE,
  SAVE_SHORT,
} from "@/lib/pricing-copy";

const TITLE = "Pricing — one plan, everything included | Super Agent Skill";
const DESCRIPTION = `Public capabilities are free forever. Pro is ${PRICE_YEARLY}/year (${PRO_YEARLY_DISCOUNT_PCT}% off ${PRICE_YEARLY_LIST}) or ${PRICE_MONTHLY}/month and includes the Agent Factory, Agent Store, University and unlimited tested reviews.`;


export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://superagentskill.com/pricing" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/pricing" }],
  }),
  component: Pricing,
});

const INCLUDED = [
  "Unlimited skill reviews with full graded reports (format + substance, with evidence)",
  "Continuous adversarial re-testing on every capability you installed",
  "The Agent Factory — build a custom corporate agent from one prompt",
  "The Agent Store — 33 ready-made agents with soul, guardrails and skills",
  "SAK University — diagnosis, adaptive curriculum, residency and portable credentials",
  "Batch review API, MCP tools and the official SDKs",
  "Private packages, signed releases and mutual NDA on request",
  "Everything you create stays yours, forever",
];

const FREE = [
  "Unlimited public skills, playbooks, souls and guardrails through the MCP gateway",
  "No account needed to browse or install public capabilities",
  "Public Trust Scores, reviews and signed release artifacts",
];

const ENTERPRISE = [
  "Private package registry",
  "SAML SSO & RBAC",
  "Compliance & audit logs",
  "Centralized upgrade policy",
  "Dedicated support",
];

type Cadence = "yearly" | "monthly";

function Pricing() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const { openCheckout, checkoutElement, isOpen, closeCheckout } = useStripeCheckout();
  const [cadence, setCadence] = useState<Cadence>("yearly");

  const onGetPro = () => {
    if (!user) return window.location.assign("/signup?next=/pricing");
    if (isActive) return window.location.assign("/account/billing");
    openCheckout({
      priceId: cadence === "yearly" ? "agent_pass_pro_yearly" : "agent_pass_pro_monthly",
      returnUrl: `${window.location.origin}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=Pro`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Nav />

      <section className="relative border-b border-border">
        <div className="absolute inset-0 hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            One plan. Everything included.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            No tiers to compare, no add-ons, no credit packs to reason about. Public capabilities stay
            free forever. Pro is for when you want your own capabilities tested, built and kept
            current.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Cadence toggle */}
        <div className="mx-auto flex w-fit items-center rounded-full border border-border bg-surface p-1 text-sm">
          {(["yearly", "monthly"] as Cadence[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              aria-pressed={cadence === c}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                cadence === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "yearly" ? `Yearly · ${SAVE_SHORT}` : "Monthly"}
            </button>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-primary/40 bg-background shadow-elevated md:grid md:grid-cols-[1.2fr_1fr]">
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
          </div>

          <div className="border-t border-border bg-surface/60 p-7 md:border-l md:border-t-0 md:p-9">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Pro · billed {cadence}
            </div>
            <div className="mt-4 flex items-end gap-2">
              {cadence === "yearly" && (
                <span className="pb-2 text-2xl font-medium text-muted-foreground line-through">
                  {PRICE_YEARLY_LIST}
                </span>
              )}
              <span className="text-5xl font-semibold tracking-tight">
                {cadence === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY}
              </span>
              <span className="pb-2 text-sm text-muted-foreground">
                / {cadence === "yearly" ? "year" : "month"}
              </span>
            </div>
            {cadence === "yearly" && (
              <div className="mt-3 inline-flex items-center rounded-full border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                {SAVE_BADGE}
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {cadence === "yearly"
                ? `${PRICE_YEARLY_LIST} billed monthly, ${PRICE_YEARLY} billed yearly. Your subscription renews automatically every 12 months at the same discounted ${PRICE_YEARLY}/year rate as long as it stays active — the discount is not a first-year promo, it is the ongoing yearly price. Cancel any time and keep access until the end of your current billing year.`
                : `Full flexibility. Switch to yearly whenever you want and lock in ${PRICE_YEARLY}/year instead of ${PRICE_YEARLY_LIST}.`}
            </p>
            <button
              onClick={onGetPro}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
            >
              {isActive ? "Manage subscription" : "Get Pro →"}
            </button>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Billed in USD · cancel in one click · price locked while you stay subscribed.
            </p>
          </div>
        </div>

        {/* Free + Enterprise, stated as facts rather than competing columns */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-7">
            <div className="text-sm font-semibold">Free forever</div>
            <p className="mt-2 text-sm text-muted-foreground">
              For exploring the registry and shipping your first agent.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/marketplace"
              className="mt-6 inline-flex h-10 items-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Browse the registry →
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-background p-7">
            <div className="text-sm font-semibold">Enterprise</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Fleet-wide governance, private registries and procurement paperwork.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {ENTERPRISE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:enterprise@superagentskill.com?subject=Enterprise%20inquiry"
              className="mt-6 inline-flex h-10 items-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Talk to sales →
            </a>
          </div>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8 md:flex md:items-center md:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-primary">
              For creators
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Monetize your operational expertise.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Doctors, lawyers, engineers, copywriters, consultants — package your know-how as
              installable skills, playbooks or souls. Creators keep 80–85% on every package sold;
              Super Agent Skill takes 15–20% to power the gateway, registry and SkillForge.
            </p>
          </div>
          <Link
            to="/forge"
            className="mt-5 inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent md:mt-0"
          >
            Become a creator →
          </Link>
        </div>
      </section>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeCheckout}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeCheckout}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-sm hover:bg-accent"
              aria-label="Close"
            >
              ×
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">{checkoutElement}</div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
