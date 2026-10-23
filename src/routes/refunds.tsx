import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const SELLER = "Super Agent Skill, Inc.";
const SUPPORT_EMAIL = "contact@zeroagency.ai";
const EFFECTIVE = "May 10, 2026";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Super Agent Skill" },
      {
        name: "description",
        content:
          "30-day money-back guarantee on Super Agent Skill paid plans.",
      },
      { property: "og:title", content: "Refund Policy — Super Agent Skill" },
      {
        property: "og:description",
        content: "30-day money-back guarantee.",
      },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Refund Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold">30-day money-back guarantee</h2>
            <p className="mt-2">
              We want you to be happy with {SELLER}. If you are not satisfied with a paid
              subscription, you can request a full refund within <strong>30 days</strong> of the
              order date for any reason.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">How to request a refund</h2>
            <p className="mt-2">
              To request a refund, contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              with your order ID and reason. We will review and process the refund to your
              original payment method. Processing typically takes 5–10 business days depending
              on your bank or card issuer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Cancellations</h2>
            <p className="mt-2">
              You can cancel an active subscription at any time from your{" "}
              <a href="/account/billing" className="text-primary hover:underline">billing page</a>.
              Cancellation stops future renewals; access remains until the end of the paid period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Questions</h2>
            <p className="mt-2">
              Contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              if anything is unclear — we will help.
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </div>
  );
}
