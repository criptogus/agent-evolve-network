import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * Derive the environment from the token PREFIX, never from its mere presence.
 * A missing/unknown token is a configuration error (e.g. a production build
 * shipped before go-live finished) — silently assuming "live" turns that into
 * an opaque server-side failure instead of a visible one.
 */
function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build (missing or invalid VITE_PAYMENTS_CLIENT_TOKEN).",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** Non-throwing variant for read paths (e.g. subscription lookups). */
export function getStripeEnvironmentSafe(): StripeEnv | null {
  try {
    return paymentsEnvironment();
  } catch {
    return null;
  }
}
