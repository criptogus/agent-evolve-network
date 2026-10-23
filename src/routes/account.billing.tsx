import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { createPortalSession } from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/account/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Super Agent Skill" },
      {
        name: "description",
        content: "Manage your Super Agent Skill subscription, plan and invoices.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { checkout?: string; session_id?: string } => ({
    checkout: typeof s.checkout === "string" ? s.checkout : undefined,
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: BillingPage,
});

function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { subscription, isActive, environment, refetch } = useSubscription();
  const { openCheckout, checkoutElement, isOpen, closeCheckout } = useStripeCheckout();
  const search = Route.useSearch();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/account/billing" } });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (search.checkout === "success") {
      toast.success("Payment received — finalizing your subscription...");
      const t = setInterval(refetch, 2500);
      const stop = setTimeout(() => clearInterval(t), 30000);
      return () => {
        clearInterval(t);
        clearTimeout(stop);
      };
    }
  }, [search.checkout, refetch]);

  const onSubscribe = () => {
    if (!user) return;
    openCheckout({
      priceId: "agent_pass_pro_monthly",
      returnUrl: `${window.location.origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const onManage = async () => {
    try {
      if (!environment) throw new Error("Payments are not configured for this build.");
      const result = await createPortalSession({
        data: {
          environment,
          returnUrl: `${window.location.origin}/account/billing`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open portal");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Account
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Billing</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link to="/account/usage" className="text-muted-foreground hover:text-foreground">
              Usage
            </Link>
            <Link to="/account/tokens" className="text-muted-foreground hover:text-foreground">
              Tokens
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background p-7 shadow-elevated">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current plan</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {isActive ? "Agent Pass — Pro" : "Hacker (Free)"}
              </div>
              {subscription?.current_period_end && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
              {subscription && (
                <div className="mt-1 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono uppercase tracking-wider ${
                      isActive ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {subscription.status}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isActive ? (
                <button
                  onClick={onManage}
                  className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-surface"
                >
                  Manage subscription
                </button>
              ) : (
                <button
                  onClick={onSubscribe}
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95"
                >
                  Upgrade to Pro — $19/mo
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <Feature title="Unlimited evolution upgrades" included={isActive} />
            <Feature title="SkillForge AI included" included={isActive} />
            <Feature title="Health scoring & weekly reports" included={isActive} />
            <Feature title="All marketplace packages" included={isActive} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Payments are processed securely. You can cancel anytime from the customer portal.
        </p>
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

function Feature({ title, included }: { title: string; included: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          included ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {included ? "✓" : "—"}
      </span>
      <span className={included ? "text-foreground" : "text-muted-foreground"}>{title}</span>
    </div>
  );
}
