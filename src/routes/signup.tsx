import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Super Agent Skill" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? s.next : undefined }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const target = next || "/account/billing";
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm your email");
    navigate({ to: "/login", search: { next } });
  };

  const onGoogle = async () => {
    setBusy(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next || "/account/billing"}`,
    });
    if (error) {
      toast.error(error.message ?? "Could not sign up with Google");
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
          <p className="mt-1 text-sm text-muted-foreground">Start with the free Hacker plan. Upgrade anytime.</p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            Continue with Google
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
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
