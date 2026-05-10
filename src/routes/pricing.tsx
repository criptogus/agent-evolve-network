import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AgentForge" },
      { name: "description", content: "Simple, usage-aligned pricing. From individual agents to enterprise-wide synchronization." },
    ],
  }),
  component: Pricing,
});

const TIERS = [
  {
    name: "Hacker",
    price: "$0",
    cadence: "free forever",
    blurb: "For exploring the registry and shipping your first agent.",
    features: ["MCP gateway access", "Public registry", "3 installed packages", "Community support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Agent Pass",
    price: "$19",
    cadence: "per agent / month",
    blurb: "The core subscription for continuously evolving agents.",
    features: ["Unlimited upgrades", "SkillForge AI included", "Automatic improvements", "Health scoring & weekly reports", "All marketplace packages"],
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
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="relative border-b border-border">
        <div className="absolute inset-0 hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Aligned with the value your agent ships.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Creators keep 80–85% on every package sold. AgentForge takes 15–20% to power the gateway, registry and Evolution Engine.
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
              <button className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-all ${
                t.highlight ? "bg-primary text-primary-foreground hover:opacity-95" : "border border-border bg-surface-elevated text-foreground hover:bg-accent"
              }`}>
                {t.cta}
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
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Monetize your operational expertise.</h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Doctors, lawyers, engineers, copywriters, consultants — package your know-how as installable skills, playbooks or souls. Earn 80–85% revenue share.
            </p>
          </div>
          <a href="#" className="mt-5 inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent md:mt-0">
            Become a creator →
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
