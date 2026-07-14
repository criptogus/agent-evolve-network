import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { captureRefFromUrl, getStoredRef, clearStoredRef } from "@/lib/referrals/capture";
import { claimReferral } from "@/lib/referrals/referrals.functions";
import { useTrack, useTrackOnce } from "@/lib/telemetry/use-track";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Super Agent Skill" },
      {
        name: "description",
        content:
          "Create your Super Agent Skill account and connect any MCP-compatible agent in 30 seconds.",
      },
      { property: "og:title", content: "Create account — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Create your account and connect Claude, Cursor, Codex or Grok via MCP in 30 seconds.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/signup" }],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: SignupPage,
});

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // First-touch referral capture from ?ref=CODE on landing.
    captureRefFromUrl();

    const target = next || "/account/billing";
    const tryClaim = async () => {
      const code = getStoredRef();
      if (!code) return;
      try {
        const r = await claimReferral({ data: { code, source_url: window.location.href } });
        if (r?.ok) clearStoredRef();
      } catch {
        /* non-fatal */
      }
    };
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await tryClaim();
        navigate({ to: target, replace: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s) {
        await tryClaim();
        navigate({ to: target, replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      toast.error("You must accept the Terms and Contributor IP Assignment to continue.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name,
          accepted_terms_at: new Date().toISOString(),
          accepted_ip_assignment: true,
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm your email");
    navigate({ to: "/login", search: { next } });
  };

  const onGoogle = async () => {
    if (!accepted) {
      toast.error("You must accept the Terms and Contributor IP Assignment to continue.");
      return;
    }
    setBusy(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next || "/account/billing"}`,
    });
    if (error) {
      toast.error(error.message ?? "Could not sign up with Google");
      setBusy(false);
    }
  };

  const onGithub = async () => {
    if (!accepted) {
      toast.error("You must accept the Terms and Contributor IP Assignment to continue.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}${next || "/account/billing"}`,
      },
    });
    if (error) {
      toast.error(error.message ?? "Could not sign up with GitHub");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center px-6 py-16">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">Super Agent Skill</span>
        </Link>
        <div className="w-full rounded-2xl border border-border bg-background p-7 shadow-elevated">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with the free Hacker plan. Upgrade anytime.
          </p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy || !accepted}
            title={!accepted ? "Accept the Terms below first" : undefined}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={onGithub}
            disabled={busy || !accepted}
            title={!accepted ? "Accept the Terms below first" : undefined}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            <GithubIcon /> Continue with GitHub
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (8+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/90">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono uppercase tracking-wider text-primary">
                  Before you sign — what you're assigning
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to="/contributor-faq"
                    className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    FAQ
                  </Link>
                  <Link
                    to="/terms"
                    hash="contributor-ip"
                    className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Read §6.1 →
                  </Link>
                </div>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>
                    Any <span className="text-foreground">skill, playbook, soul or guardrail</span>{" "}
                    you publish, submit for review, or upload to be improved becomes the{" "}
                    <span className="text-foreground">
                      exclusive property of Super Agent Skill, Inc.
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>
                    We may{" "}
                    <span className="text-foreground">use, modify, sublicense and resell</span> it
                    worldwide, without further notice or compensation.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>
                    You keep the right to <span className="text-foreground">use your own work</span>{" "}
                    elsewhere — but you can't revoke our rights later.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>
                    Browsing the marketplace stays{" "}
                    <span className="text-foreground">always free</span> and assigns nothing.
                  </span>
                </li>
              </ul>
            </div>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                I have read the summary above and agree to the{" "}
                <Link to="/terms" className="text-foreground underline-offset-2 hover:underline">
                  Terms
                </Link>{" "}
                and the{" "}
                <Link
                  to="/terms"
                  hash="contributor-ip"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Contributor IP Assignment (§6.1)
                </Link>
                .
              </span>
            </label>
            <button
              type="submit"
              disabled={busy || !accepted}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
