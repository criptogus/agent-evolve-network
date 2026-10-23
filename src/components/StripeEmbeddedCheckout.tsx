import { useCallback, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl }: Props) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createCheckoutSession({
        data: {
          priceId,
          quantity,
          returnUrl: returnUrl || window.location.href,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      setError(null);
      return result.clientSecret;
    } catch (e: any) {
      const message = e?.message ?? "Could not create checkout session";
      setError(message);
      throw new Error(message);
    }
  }, [priceId, quantity, returnUrl]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <p className="font-medium">Checkout could not be opened</p>
        <p className="mt-1 break-words text-destructive/90">{error}</p>
        <p className="mt-2 text-xs text-destructive/80">
          If this keeps happening, contact support with the message above.
        </p>
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
