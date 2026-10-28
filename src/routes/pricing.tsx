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
  AGENT_PASS_PRICING,
  PRICE_AGENT_PASS,
  PRICE_MONTHLY,
  PRICE_YEARLY,
  PRICE_YEARLY_LIST,
  PRO_YEARLY_DISCOUNT_PCT,
  SAVE_BADGE,
  SAVE_SHORT,
} from "@/lib/pricing-copy";

const TITLE = "Pricing — Free, Pro, Agent Pass, Enterprise | Super Agent Skill";
const DESCRIPTION = `Public capabilities are free forever. Pro is ${PRICE_YEARLY}/year (${PRO_YEARLY_DISCOUNT_PCT}% off ${PRICE_YEARLY_LIST}) or ${PRICE_MONTHLY}/month and includes 1 production agent. Agent Pass is ${PRICE_AGENT_PASS}/agent/month (standalone, monthly only — no Pro required). Enterprise is custom.`;

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

const FREE = [
  "Unlimited public skills, playbooks, souls and guardrails through the MCP gateway",
  "No account needed to browse or install public capabilities",
  "Public Trust Scores, reviews and signed release artifacts",
];

const PRO_INCLUDED = [
  "1 production agent included",
  "Agent Factory — build a custom corporate agent from one prompt",
  "Agent Store — 33 ready-made agents with soul, guardrails and skills",
  "SAK University — diagnosis, adaptive curriculum, residency and credentials",
  "Unlimited adversarial skill reviews with full graded reports",
  "Batch review API, MCP tools and the official SDKs",
  "Everything you create stays yours, forever",
];

const AGENT_PASS_INCLUDED = [
  "Standalone — no Pro required",
  "Monthly only — no yearly plan",
  "Unlimited upgrades per production agent",
  "SkillForge AI for each agent seat",
  "Weekly health report per agent",
  "Quantity adjustable in Checkout (1–100 seats)",
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
  const [agentQty, setAgentQty] = useState(1);

  const requireAuth = () => {
    if (!user) {
      window.location.assign("/signup?next=/pricing");
      return false;
    }
    return true;
  };

  const onGetPro = () => {
    if (!requireAuth()) return;
    if (isActive) return window.location.assign("/account/billing");
    openCheckout({
      // New SKUs — legacy agent_pass_pro_* are grandfather-only.
      priceId: cadence === "yearly" ? "sak_pro_yearly" : "sak_pro_monthly",
      returnUrl: `${window.location.origin}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=Pro`,
    });
  };

  const onGetAgentPass = () => {
    if (!requireAuth()) return;
    openCheckout({
      priceId: "sak_agent_pass_monthly",
      quantity: agentQty,
      adjustableQuantity: true,
      returnUrl: `${window.location.origin}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=AgentPass`,
    });
  };

  const agentTotal = AGENT_PASS_PRICING.monthlyPerAgent * agentQty;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Nav />

      <section className="relative border-b border-border">
        <div className="absolute inset-0 hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Free, Pro, Agent Pass, Enterprise.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            Super Agent Skill keeps public capabilities free forever. Pro includes 1 production
            agent. Agent Pass is standalone (monthly only — no Pro required) for extra agents or
            agent-only use. Enterprise covers fleet governance.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-4">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Free forever
            </div>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-tight">$0</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
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
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Browse the registry →
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-primary/40 bg-background p-6 shadow-elevated">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Pro</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Pro is the human plan: Agent Factory, Agent Store, University and unlimited adversarial
              reviews — plus 1 production agent included. Extra agents are Agent Pass.
            </p>

            <div className="mt-4 flex w-fit items-center rounded-full border border-border bg-surface p-1 text-xs">
              {(["yearly", "monthly"] as Cadence[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadence(c)}
                  aria-pressed={cadence === c}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    cadence === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "yearly" ? `Yearly · ${SAVE_SHORT}` : "Monthly"}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-end gap-2">
              {cadence === "yearly" && (
                <span className="pb-1.5 text-lg font-medium text-muted-foreground line-through">
                  {PRICE_YEARLY_LIST}
                </span>
              )}
              <span className="text-4xl font-semibold tracking-tight">
                {cadence === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY}
              </span>
              <span className="pb-1.5 text-sm text-muted-foreground">
                / {cadence === "yearly" ? "year" : "month"}
              </span>
            </div>
            {cadence === "yearly" && (
              <div className="mt-3 inline-flex items-center rounded-full border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                {SAVE_BADGE}
              </div>
            )}
            <ul className="mt-5 space-y-2.5 text-sm">
              {PRO_INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onGetPro}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
            >
              {isActive ? "Manage subscription" : "Get Pro →"}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Billed in USD · cancel in one click · price locked while subscribed.
            </p>
          </div>

          {/* Agent Pass */}
          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Agent Pass
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Standalone — no Pro required. Monthly only. Each seat: unlimited upgrades, SkillForge
              and weekly report. Also covers extras beyond Pro&apos;s included agent.
            </p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-tight">{PRICE_AGENT_PASS}</span>
              <span className="pb-1.5 text-sm text-muted-foreground">/ agent / month</span>
            </div>

            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Number of agents
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease agents"
                  onClick={() => setAgentQty((q) => Math.max(1, q - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-sm hover:bg-accent"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={agentQty}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    if (Number.isNaN(n)) return;
                    setAgentQty(Math.min(100, Math.max(1, n)));
                  }}
                  className="h-9 w-16 rounded-md border border-border bg-background px-2 text-center text-sm tabular-nums"
                />
                <button
                  type="button"
                  aria-label="Increase agents"
                  onClick={() => setAgentQty((q) => Math.min(100, q + 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-sm hover:bg-accent"
                >
                  +
                </button>
              </div>
            </label>
            <p className="mt-2 text-sm text-muted-foreground">
              Total{" "}
              <span className="font-semibold text-foreground">${agentTotal}</span>
              /month
            </p>

            <ul className="mt-5 space-y-2.5 text-sm">
              {AGENT_PASS_INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onGetAgentPass}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Get Agent Pass →
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Monthly billing only · buy without Pro · quantity adjustable in Checkout.
            </p>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Enterprise
            </div>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-tight">Custom</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
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
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium transition-colors hover:bg-accent"
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
