import { createFileRoute } from "@tanstack/react-router";
import { handleMcpHttp, mcpInfoResponse, CORS_HEADERS } from "@/lib/mcp/http.server";

/**
 * WAF-bypass mirror of `/api/mcp`.
 *
 * Customers running agents from datacenter IP ranges (Vercel, Replit,
 * HuggingFace Spaces, Codespaces, corporate egress) reported 403s from the
 * edge firewall on `/api/mcp`. The `/api/public/*` prefix is the one path the
 * platform gate leaves fully open to anonymous, non-browser clients, so this
 * route exposes the exact same MCP server (same tools, same OAuth/PAT auth,
 * same quotas) at a path those runtimes can reach.
 *
 * Auth is unchanged: write tools still require a verified bearer, anonymous
 * callers still land in the anonymous quota bucket.
 */
export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/event-stream")) return handleMcpHttp(request);
        return mcpInfoResponse("/api/public/mcp");
      },
      POST: async ({ request }) => handleMcpHttp(request),
      DELETE: async ({ request }) => handleMcpHttp(request),
    },
  },
});
