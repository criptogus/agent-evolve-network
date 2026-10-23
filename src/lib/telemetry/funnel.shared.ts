import { z } from "zod";

export const FUNNEL_EVENTS = [
  "connect_viewed",
  "oauth_authorize_viewed",
  "oauth_authorize_approved",
  "oauth_authorize_denied",
  "oauth_success_shown",
  "oauth_loopback_attempted",
  "oauth_manual_code_copied",
  "oauth_scheme_triggered",
  "mcp_first_call",
  "mcp_first_write",
  "install_button_clicked",
  "pat_minted",
  // Landing / signup funnel
  "hero_viewed",
  "cta_clicked",
  "signup_viewed",
  "signup_started",
  "signup_completed",
  "signup_failed",
] as const;

export const FunnelInput = z.object({
  event: z.enum(FUNNEL_EVENTS),
  client_id: z.string().max(200).optional(),
  client_name: z.string().max(200).optional(),
  anon_hash: z.string().max(64).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export type FunnelInputData = z.infer<typeof FunnelInput>;
