import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { classifyUserAgent } from "@/lib/telemetry/bot-detect";
import type { FunnelInputData } from "./funnel.shared";

const supabaseAdmin = _supabaseAdmin as any;

/**
 * Best-effort funnel event insert. Server-authoritative tags: client-supplied
 * values in props are preserved for context but is_bot / ua_family always
 * come from the request User-Agent.
 */
export async function persistFunnelEvent(data: FunnelInputData) {
  try {
    const ua = getRequestHeader("user-agent") ?? "";
    const cls = classifyUserAgent(ua);
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
}
