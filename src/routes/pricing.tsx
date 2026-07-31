import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Super Agent Skill" },
      { name: "description", content: "Simple, usage-aligned pricing. From individual agents to enterprise-wide synchronization." },
      { property: "og:title", content: "Pricing — Super Agent Skill" },
      { property: "og:description", content: "Plans for solo builders, teams shipping agents, and enterprises rolling out fleets." },
      { property: "og:url", content: "https://superagentskill.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/pricing" }],
  }),
  component: Pricing,
});

const TIERS = [
  {
    name: "Hacker",
    price: "$0",
    cadence: "free forever",
    blurb: "For exploring the registry and shipping your first agent.",
    features: [
      "Unlimited public skills via the MCP gateway — no account needed",
      "Browse the full public registry",
      "Free account adds per-package installs (5 included), library sync & reviews",
      "Community support",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Agent Pass",
    price: "$19",
    cadence: "per agent / month",
    blurb: "Your agent's skills stay current and jailbreak-hardened automatically.",
    features: ["SkillForge auto-patching", "Continuous jailbreak re-testing", "Health scoring & weekly reports", "Priority skills", "All marketplace packages"],
    cta: "Connect agent",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "company-wide",
    blurb: "Fleet-wide synchronization, governance, and private registries.",
    features: ["Private package registry", "SAML SSO & RBAC", "Compliance & audit logs", "Centralized upgrade policy", "Dedicated support"],
    cta: "Talk to sales",
    highlight: false,
  },
];

function Pricing() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const { openCheckout, checkoutElement, isOpen, closeCheckout } = useStripeCheckout();

  const onCta = (tierName: string) => {
    if (tierName === "Hacker") return window.location.assign(user ? "/account/billing" : "/signup");
    if (tierName === "Enterprise") return window.location.assign("mailto:enterprise@superagentskill.com?subject=Enterprise%20inquiry");
    if (!user) return window.location.assign("/signup?next=/pricing");
    if (isActive) return window.location.assign("/account/billing");
    openCheckout({
      priceId: "agent_pass_pro_monthly",
      returnUrl: `${window.location.origin}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(tierName)}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Nav />
      <section className="relative border-b border-border">
        <div className="absolute inset-0 hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Aligned with the value your agent ships.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Every public skill is free through the MCP gateway — no account, no card. Pay only when
            you want your agent's skills kept current and jailbreak-hardened automatically.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-7 ${
                t.highlight ? "border-primary bg-background shadow-elevated" : "border-border bg-background"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="text-5xl font-semibold tracking-tight">{t.price}</span>
                <span className="pb-2 text-sm text-muted-foreground">/ {t.cadence}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.blurb}</p>
              <button
                onClick={() => onCta(t.name)}
                className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-all ${
                  t.highlight ? "bg-primary text-primary-foreground hover:opacity-95" : "border border-border bg-surface-elevated text-foreground hover:bg-accent"
                }`}
              >
                {isActive && t.name === "Agent Pass" ? "Manage subscription" : t.cta}
              </button>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8 md:flex md:items-center md:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-primary">For creators</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Monetize your operational expertise.</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Doctors, lawyers, engineers, copywriters, consultants — package your know-how as
              installable skills, playbooks or souls (drop-in expert personas). Creators keep
              80–85% on every package sold; Super Agent Skill takes 15–20% to power the gateway,
              registry and SkillForge.
            </p>
          </div>
          <Link to="/forge" className="mt-5 inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent md:mt-0">
            Become a creator →
          </Link>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeCheckout}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
