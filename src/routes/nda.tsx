import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

export const NDA_VERSION = "1.0";

export const Route = createFileRoute("/nda")({
  component: NdaPage,
  head: () => ({
    meta: [
      { title: "Online Non-Disclosure Agreement · Super Agent Skill" },
      {
        name: "description",
        content:
          "Mutual non-disclosure agreement accepted online, with one click — no signature, no PDF. Available for paid Super Agent Skill accounts.",
      },
      { property: "og:title", content: "Online Non-Disclosure Agreement · Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Accept the mutual non-disclosure agreement with one click. No signature, no PDF. Exclusive to paid accounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CLAUSES: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Confidential information",
    body: "All content you submit to the platform — skills, souls, guardrails, prompts, datasets, telemetry, and evaluation results — is treated as your confidential information. The same applies, in the opposite direction, to reports, scoring methodology, and non-public material we share with you.",
  },
  {
    n: "02",
    title: "Restricted use",
    body: "We use your content only to run the service you contracted: validate, evaluate, version, sign, and serve the package to your agents. No model training, republication, resale, or competitive analysis of your content.",
  },
  {
    n: "03",
    title: "Intellectual property",
    body: "Ownership remains fully yours. We do not claim ownership, co-authorship, commercial exploitation license, or derivative rights over content you keep private.",
  },
  {
    n: "04",
    title: "Minimal access",
    body: "Human access to private content is restricted to the team strictly necessary for support, and only when you request it. Every access is logged in a searchable audit trail.",
  },
  {
    n: "05",
    title: "Security",
    body: "Per-tenant isolation via RLS, encryption in transit and at rest, and the option of customer-managed keys (BYOK/CMEK) with crypto-shredding.",
  },
  {
    n: "06",
    title: "Term and termination",
    body: "These obligations apply while the account is active and for 3 years after closure. On request, we delete private content and keys within 30 days.",
  },
  {
    n: "07",
    title: "Exceptions",
    body: "What is public by your own choice (packages published on the marketplace), what you already disclosed, or what the law requires us to reveal is not confidential — in the latter case, we notify you beforehand, when permitted.",
  },
];

function NdaPage() {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const [saving, setSaving] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);

  const meta = (user?.user_metadata ?? {}) as {
    nda_accepted_at?: string | null;
    nda_version?: string | null;
  };
  const acceptedAt = justAccepted ? new Date().toISOString() : meta.nda_accepted_at || null;
  const accepted = Boolean(acceptedAt) && (justAccepted || meta.nda_version === NDA_VERSION);
  const loading = authLoading || subLoading;

  async function accept() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { nda_accepted_at: new Date().toISOString(), nda_version: NDA_VERSION },
    });
    setSaving(false);
    if (error) {
      toast.error("We couldn't record your acceptance. Please try again.");
      return;
    }
    setJustAccepted(true);
    toast.success("Non-disclosure agreement accepted and recorded.");
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <header>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Online acceptance · no signature · paid accounts
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Mutual non-disclosure agreement
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            There's no NDA to sign, and no PDF to circulate through legal. The agreement lives here
            on the site and takes effect with one click, tied to your paid account —{" "}
            <span className="font-medium text-foreground">version {NDA_VERSION}</span>.
          </p>
        </header>

        <section className="mt-10 space-y-4">
          {CLAUSES.map((c) => (
            <article key={c.n} className="rounded-lg border border-border bg-surface p-6">
              <div className="font-mono text-xs text-primary">{c.n}</div>
              <h2 className="mt-2 font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-6 md:p-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading account status…</p>
          ) : !user ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Sign in to accept</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Acceptance is recorded on your account, with date and time. Sign in to continue.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium"
                >
                  View plans
                </Link>
              </div>
            </>
          ) : accepted ? (
            <>
              <div className="inline-flex items-center gap-2 text-sm text-signal">
                <span className="size-1.5 rounded-full bg-signal" />
                <span className="font-mono uppercase tracking-wider">Agreement in effect</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Confidentiality active on your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Accepted on{" "}
                <span className="font-mono text-foreground">
                  {new Date(acceptedAt as string).toLocaleString("en-US")}
                </span>{" "}
                · version {NDA_VERSION}. Nothing else is required — no document to sign.
              </p>
            </>
          ) : !isActive ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight">
                Available for paid accounts
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Contractual confidentiality comes with paid plans. Upgrade and acceptance
                becomes available immediately on this page.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Upgrade
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium"
                >
                  View privacy policy
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Accept with one click</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                By accepting, we record the date, time, and version of the agreement on your
                account. It applies to all private content you've already submitted and to what
                you submit later.
              </p>
              <button
                type="button"
                onClick={accept}
                disabled={saving}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Recording…" : "Accept non-disclosure agreement"}
              </button>
            </>
          )}
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Need your own document, signed by your legal team? Write to{" "}
          <a
            href="mailto:enterprise@superagentskill.com?subject=NDA%20personalizado"
            className="underline underline-offset-2"
          >
            enterprise@superagentskill.com
          </a>{" "}
          — we handle enterprise cases on request.
        </p>
      </main>
      <Footer />
    </div>
  );
}
