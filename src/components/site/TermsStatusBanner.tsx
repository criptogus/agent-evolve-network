import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Discreet status banner that tells the user, at a glance, whether they have
 * accepted the Terms + Contributor IP Assignment, and which actions are
 * still locked behind those gates.
 *
 * Read-only — never blocks UI. Renders nothing once everything is accepted.
 */
export function TermsStatusBanner({ className = "" }: { className?: string }) {
  const { user, loading } = useAuth();

  // Avoid SSR/hydration flicker — render nothing while we don't know yet.
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
          You can preview every skill. <span className="text-muted-foreground">Locked:</span>{" "}
          <span className="font-medium text-foreground">install · customize · auto-create</span>.
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
  const acceptedTerms = Boolean(meta.accepted_terms_at);
  const acceptedIp = Boolean(meta.accepted_ip_assignment);
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
          Terms &amp; IP Assignment accepted — install, customize and auto-create are unlocked.
        </span>
      </div>
    );
  }

  // Signed in but missing one or both acceptances.
  const missing: string[] = [];
  if (!acceptedTerms) missing.push("Terms of Service");
  if (!acceptedIp) missing.push("Contributor IP Assignment");

  return (
    <div
      role="status"
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-foreground/90 " +
        className
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-warning" />
        <span className="font-mono uppercase tracking-wider text-warning">Action needed</span>
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
        <Link
          to="/account"
          className="rounded border border-warning/60 bg-warning/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-warning hover:bg-warning/20"
        >
          Accept now
        </Link>
      </div>
    </div>
  );
}
