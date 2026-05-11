import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

interface Props {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({
  priceId,
  quantity,
  customerEmail,
  userId,
  returnUrl,
}: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const secret = await createCheckoutSession({
      data: {
        priceId,
        quantity,
        customerEmail,
        userId,
        returnUrl: returnUrl || window.location.href,
        environment: getStripeEnvironment(),
      },
    });
    if (!secret) throw new Error("Could not create checkout session");
    return secret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
