/**
 * Funnel telemetry for the MCP connect flow. The browser calls
 * `recordFunnelEvent` from the consent page, the success page and the
 * /connect landing; the MCP route fires `mcp_first_call` server-side
 * the first time a given user/anon hash invokes a tool.
 *
 * Runtime helpers live in ./funnel.server (server-only) and constants in
 * ./funnel.shared, because server-fn splitting strips module-scope siblings.
 */
import { createServerFn } from "@tanstack/react-start";
import { FunnelInput } from "./funnel.shared";

export const recordFunnelEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FunnelInput.parse(d))
  .handler(async ({ data }) => {
    const { persistFunnelEvent } = await import("./funnel.server");
    await persistFunnelEvent(data);
    return { ok: true };
  });

export type { FunnelEvent } from "./funnel.shared";
