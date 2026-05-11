import { useState, useCallback } from "react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const checkoutElement =
    isOpen && options ? <StripeEmbeddedCheckout {...options} /> : null;

  return { openCheckout, closeCheckout, isOpen, checkoutElement };
}
