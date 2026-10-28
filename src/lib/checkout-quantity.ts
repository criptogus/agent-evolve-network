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
