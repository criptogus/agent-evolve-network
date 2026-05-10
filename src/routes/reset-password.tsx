import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Super Agent Skill" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    window.location.assign("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-background p-7 shadow-elevated">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "request" ? "Reset password" : "Set a new password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "request"
              ? "We'll email you a secure link."
              : "Enter your new password below."}
          </p>
          {mode === "request" ? (
            <form onSubmit={sendReset} className="mt-5 space-y-3">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button
                disabled={busy}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <form onSubmit={updatePassword} className="mt-5 space-y-3">
              <input
                type="password"
                required
                minLength={8}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button
                disabled={busy}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                {busy ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Back to sign in</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
