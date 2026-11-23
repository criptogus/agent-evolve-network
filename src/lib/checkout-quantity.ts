/** Pure checkout quantity helpers (unit-tested; used by createCheckoutSession). */

export function validateCheckoutQuantity(quantity: unknown): number {
  if (quantity === undefined || quantity === null) return 1;
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    throw new Error("quantity must be an integer between 1 and 100");
  }
  return quantity;
}

export function shouldEnableAdjustableQuantity(input: {
  priceId: string;
  quantity?: number;
  adjustableQuantity?: boolean;
}): boolean {
  if (typeof input.adjustableQuantity === "boolean") return input.adjustableQuantity;
  if (input.priceId.startsWith("sak_agent_pass_")) return true;
  return typeof input.quantity === "number" && input.quantity > 0;
}

/** Seat-based prices (one seat per production agent) are the only ones sold in quantity. */
export function isSeatPrice(priceId: string): boolean {
  return priceId.startsWith("sak_agent_pass_");
}

/**
 * Quantity actually sent to Stripe. Seat prices honour the validated quantity;
 * every other price (Pro plans, one-off products) is always sold as exactly 1.
 */
export function resolveCheckoutQuantity(priceId: string, quantity: unknown): number {
  const validated = validateCheckoutQuantity(quantity);
  return isSeatPrice(priceId) ? validated : 1;
}

const PROJECT_ID = "b00a8021-9d8d-4f49-a581-628727b71f68";
const ALLOWED_RETURN_HOSTS = new Set([
  "superagentskill.com",
  "www.superagentskill.com",
  "agent-evolve-network.lovable.app",
]);

/** True for this app's own hosts: the custom domain, published app and its previews. */
export function isAllowedReturnHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_RETURN_HOSTS.has(host)) return true;
  if (
    (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) &&
    host.includes(PROJECT_ID)
  ) {
    return true;
  }
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Accept a checkout / billing return URL only when it points back at this app.
 * Throws for any other destination so Stripe never redirects buyers elsewhere.
 */
export function validateReturnUrl(returnUrl: unknown): string {
  if (typeof returnUrl !== "string" || returnUrl.length > 2048) {
    throw new Error("Invalid return URL");
  }
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    throw new Error("Invalid return URL");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Invalid return URL");
  }
  if (url.username || url.password || !isAllowedReturnHost(url.hostname)) {
    throw new Error("Invalid return URL");
  }
  return returnUrl;
}
