/**
 * Funnel telemetry for the MCP connect flow. The browser calls
 * `recordFunnelEvent` from the consent page, the success page and the
 * /connect landing; the MCP route fires `mcp_first_call` server-side
 * the first time a given user/anon hash invokes a tool.
 *
 * Every event is tagged server-side with `is_bot` and `ua_family` from
 * the request User-Agent (client cannot override). Reports subtract
 * bots by default; raw events are always kept.
 *
 * Telemetry is best-effort — the RPC swallows any error so a failed
 * insert never breaks the user's flow.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { classifyUserAgent } from "@/lib/telemetry/bot-detect";
const supabaseAdmin = _supabaseAdmin as any;

const EVENTS = [
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

const Input = z.object({
  event: z.enum(EVENTS),
  client_id: z.string().max(200).optional(),
  client_name: z.string().max(200).optional(),
  anon_hash: z.string().max(64).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const recordFunnelEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    try {
      const ua = getRequestHeader("user-agent") ?? "";
      const cls = classifyUserAgent(ua);
      // Server-authoritative tags: client-supplied values in props are
      // preserved for context but is_bot / ua_family always come from us.
      const props = {
        ...(data.props ?? {}),
        is_bot: cls.isBot,
        ua_family: cls.family,
        ua: ua.slice(0, 300),
      };
      await supabaseAdmin.rpc("record_mcp_funnel_event", {
        _event: data.event,
        _client_id: data.client_id ?? null,
        _client_name: data.client_name ?? null,
        _anon_hash: data.anon_hash ?? null,
        _props: props,
      } as never);
    } catch {
      // never fail user flow on telemetry
    }
    return { ok: true };
  });

export type FunnelEvent = (typeof EVENTS)[number];
