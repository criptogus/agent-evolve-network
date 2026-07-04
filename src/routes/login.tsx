import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { captureRefFromUrl, getStoredRef, clearStoredRef } from "@/lib/referrals/capture";
import { claimReferral } from "@/lib/referrals/referrals.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Super Agent Skill" },
      {
        name: "description",
        content: "Sign in to manage your connected agents, packages and subscription.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/login" }],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goNext = (fallback = "/account/billing") => {
    const target = next || fallback;
    // If `next` includes a query string (e.g. /oauth/authorize?...), TanStack
    // Router's typed navigate({ to }) treats it as a literal pathname and 404s.
    // Use a real browser navigation so the destination route's validateSearch runs.
    if (target.includes("?") || target.includes("#")) {
      window.location.assign(target);
    } else {
      navigate({ to: target, replace: true });
    }
  };

  useEffect(() => {
    captureRefFromUrl();
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
        goNext();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s) {
        await tryClaim();
        goNext();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    router.invalidate();
    goNext();
  };

  const onGoogle = async () => {
    setBusy(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next || "/account/billing"}`,
    });
    if (error) {
      toast.error(error.message ?? "Could not sign in with Google");
      setBusy(false);
    }
  };

  const onGithub = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}${next || "/account/billing"}`,
      },
    });
    if (error) {
      toast.error(error.message ?? "Could not sign in with GitHub");
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue evolving your agents.</p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <button
            type="button"
            onClick={onGithub}
            disabled={busy}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            <GithubIcon /> Continue with GitHub
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onEmailSignIn} className="space-y-3">
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/reset-password" className="hover:text-foreground">
              Forgot password?
            </Link>
            <Link to="/signup" className="hover:text-foreground">
              Create account →
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.4l-6.5 5C9.6 39 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.1 5C40.8 35.4 43.5 30.1 43.5 24c0-1.2-.1-2.4 0.1-3.5z"
      />
    </svg>
  );
}
