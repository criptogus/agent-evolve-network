import { z } from "zod";
export const IndexReceipt = z.object({
  requestId: z.string().uuid(),
  indexed: z.number().int().min(0).max(25),
  pendingBefore: z.number().int().min(1).max(2000),
  providerRequests: z.literal(1),
  model: z.string().min(1).max(200),
  reportedModel: z.string().min(1).max(200),
  dimensions: z.literal(1536),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .nullable(),
  slugs: z.array(z.string().min(1).max(160)).min(1).max(25),
});
const base = z.object({
  model: z.string().min(1).max(200),
  receipts: z.array(IndexReceipt).max(2000),
});
export const IndexJournal = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("checkpoint") }),
  base.extend({
    status: z.literal("inflight"),
    requestId: z.string().uuid(),
    maximumPackages: z.number().int().min(1).max(25),
    startedAt: z.string().datetime(),
  }),
]);
export function parseIndexJournal(raw: string | null) {
  if (raw === null) return null;
  if (raw.length > 2000000) throw new Error("Oversized index journal; stop without retry");
  const parsed = IndexJournal.parse(JSON.parse(raw));
  if (new Set(parsed.receipts.map((r) => r.requestId)).size !== parsed.receipts.length)
    throw new Error("Duplicate index receipt; stop without retry");
  return parsed;
}
