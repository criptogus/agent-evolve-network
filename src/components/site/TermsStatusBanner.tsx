import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Discreet status banner that tells the user, at a glance, whether they have
 * accepted the Terms + Contributor IP Assignment, and which actions are
 * still locked behind those gates.
 *
 * Read-only — never blocks UI. Renders nothing once everything is accepted.
 */
export function TermsStatusBanner({ className = "" }: { className?: string }) {
  const { user, loading } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);

  if (loading) return null;

  // Logged-out: browsing is free, install/customize requires an account.
  if (!user) {
    return (
      <div
        role="status"
        className={
          "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/70 bg-surface/60 px-3 py-2 text-xs text-muted-foreground " +
          className
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          <span className="font-mono uppercase tracking-wider">Browsing only</span>
        </span>
        <span className="text-foreground/80">
          Browse free, no account. To install per-package and sync your library, create a free
          account — or skip signup entirely:{" "}
          <Link
            to="/docs/mcp"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            add our MCP gateway URL
          </Link>{" "}
          to your agent.
        </span>
        <Link
          to="/signup"
          className="ml-auto rounded border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-foreground hover:bg-background"
        >
          Sign up free
        </Link>
      </div>
    );
  }

  const meta = (user.user_metadata ?? {}) as {
    accepted_terms_at?: string | null;
    accepted_ip_assignment?: boolean | null;
  };
  const acceptedTerms = Boolean(meta.accepted_terms_at) || justAccepted;
  const acceptedIp = Boolean(meta.accepted_ip_assignment) || justAccepted;
  const allAccepted = acceptedTerms && acceptedIp;

  if (allAccepted) {
    return (
      <div
        role="status"
        className={
          "inline-flex items-center gap-2 rounded-md border border-signal/30 bg-signal/5 px-3 py-1.5 text-xs text-muted-foreground " +
          className
        }
      >
        <span className="size-1.5 rounded-full bg-signal" />
        <span className="font-mono uppercase tracking-wider text-signal">Account ready</span>
        <span>
          Terms &amp; IP Assignment accepted — install, customize and auto-create unlocked.
        </span>
      </div>
    );
  }

  const missing: string[] = [];
  if (!acceptedTerms) missing.push("Terms of Service");
  if (!acceptedIp) missing.push("Contributor IP Assignment");

  async function acceptNow() {
    setAccepting(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        accepted_terms_at: new Date().toISOString(),
        accepted_ip_assignment: true,
      },
    });
    setAccepting(false);
    if (error) {
      toast.error("Could not record acceptance. Try again.");
      return;
    }
    setJustAccepted(true);
    toast.success("Terms accepted — install and customize unlocked.");
  }

  return (
    <div
      role="status"
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-foreground/90 " +
        className
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="font-mono uppercase tracking-wider text-primary">Action needed</span>
      </span>
      <span>
        Accept the {missing.join(" and ")} to unlock{" "}
        <span className="font-medium">install · customize · auto-create</span>.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/terms"
          className="rounded border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Read terms
        </Link>
        <button
          type="button"
          onClick={acceptNow}
          disabled={accepting}
          className="rounded border border-primary/60 bg-primary/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {accepting ? "Saving…" : "Accept now"}
        </button>
      </div>
    </div>
  );
}
