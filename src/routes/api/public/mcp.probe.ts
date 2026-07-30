import { createFileRoute } from "@tanstack/react-router";

/**
 * Fully anonymous, side-effect-free health probe for the MCP endpoint.
 *
 * Purpose: agents in ephemeral runtimes (Vercel, Replit, HuggingFace Spaces,
 * Codespaces) hit the main `/api/mcp` and get a Cloudflare 403 because Bot
 * Fight Mode classifies their UA as hostile. This endpoint sits under
 * `/api/public/*` (which the platform's site-auth gate leaves open) and
 * returns 200 to any method with a fixed JSON payload, giving the caller a
 * way to prove that
 *   (a) DNS + TLS work, and
 *   (b) the origin itself is reachable from their runtime.
 *
 * If the probe returns 200 but `/api/mcp` still 403s, the caller can be
 * confident it's WAF-shaped and can react (retry with a browser-shaped UA,
 * use the client library) instead of assuming the service is down.
 */
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function body() {
  return JSON.stringify({
    ok: true,
    service: "superagentskill-mcp",
    endpoint: "/api/public/mcp",
    mirror: "/api/mcp",
    mirror_hint: "Canonical MCP URL is https://superagentskill.com/api/public/mcp — it is the firewall-safe path and works from every runtime. The legacy /api/mcp still works from browsers but can be blocked for datacenter IPs.",
    transport: "streamable-http",
    hint: "POST JSON-RPC 2.0 to /api/public/mcp with Accept: application/json, text/event-stream. Read-only tools (review_skill, list/search/get) are anonymous.",
    docs: "https://superagentskill.com/docs/mcp",
    ts: new Date().toISOString(),
  });
}

export const Route = createFileRoute("/api/public/mcp/probe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async () => new Response(body(), { status: 200, headers }),
      HEAD: async () => new Response(null, { status: 200, headers }),
      POST: async () => new Response(body(), { status: 200, headers }),
    },
  },
});
