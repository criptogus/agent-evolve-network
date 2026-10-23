import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    // Preserve the gateway wire contract; Stripe SDK accepts only its latest literal.
    apiVersion: "2026-03-25.dahlia" as NonNullable<
      NonNullable<ConstructorParameters<typeof Stripe>[1]>["apiVersion"]
    >,
    httpClient: Stripe.createFetchHttpClient(
      (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const gatewayUrl = input.toString().replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
        return fetch(gatewayUrl, {
          ...init,
          headers: {
            ...Object.fromEntries(new Headers(init?.headers).entries()),
            "X-Connection-Api-Key": connectionApiKey,
            "Lovable-API-Key": lovableApiKey,
          },
        });
      },
    ),
  });
}

export async function verifyWebhook(req: Request, env: StripeEnv): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  const event: unknown = JSON.parse(body);
  if (
    !event ||
    typeof event !== "object" ||
    !("type" in event) ||
    typeof event.type !== "string" ||
    !("data" in event) ||
    !event.data ||
    typeof event.data !== "object" ||
    !("object" in event.data)
  )
    throw new Error("Invalid webhook event");
  // Authenticated Stripe payload. The event discriminator selects its SDK object type.
  return event as Stripe.Event;
}

/**
 * Turn a Stripe SDK error into a message safe (and useful) to show a buyer.
 * Without this, TanStack's request middleware collapses Stripe failures into
 * a generic 500 and the checkout page looks simply "broken".
 */
export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
      };
    };
    const message = e.raw?.message ?? e.message;
    if (message) {
      const details = [
        e.raw?.type ?? e.type,
        e.raw?.code ?? e.code,
        e.raw?.decline_code ?? e.decline_code,
        e.raw?.param ?? e.param,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }
  return "Stripe request failed";
}
