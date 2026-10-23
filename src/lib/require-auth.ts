import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook that returns a guard. Call `guard()` before any action that requires
 * an account (install, customize, purchase, publish). Returns true when the
 * user is signed in; otherwise toasts and redirects to /signup with `next`.
 *
 * Reading is open to everyone — gating is enforced only on write/install/
 * customize actions, per platform policy.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return function requireAuth(
    action: string = "continue",
  ): boolean {
    if (loading) return false;
    if (user) return true;
    toast.message("Create a free account", {
      description: `Sign up to ${action}. Browsing is always free.`,
    });
    const next =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    navigate({ to: "/signup", search: { next } });
    return false;
  };
}
