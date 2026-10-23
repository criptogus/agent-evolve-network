import { z } from "zod";
/** Queue storage is JSON; validate before handing a message to the email client. */
export const QueuedEmailSchema = z.object({
  run_id: z.string().optional(),
  to: z.string().min(1),
  from: z.string().min(1),
  sender_domain: z.string().optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  purpose: z.string().optional(),
  label: z.string().optional(),
  idempotency_key: z.string().optional(),
  unsubscribe_token: z.string().optional(),
  message_id: z.string().optional(),
  queued_at: z.string().optional(),
});
