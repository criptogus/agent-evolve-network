import { createFileRoute } from "@tanstack/react-router";
import { handleMcpHttp, mcpInfoResponse, CORS_HEADERS } from "@/lib/mcp/http.server";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      // A bare GET is what agents in Vercel/Replit/Codespaces try first as a
      // sniff test. Short-circuit with a friendly 200 that also points at the
      // /api/public/mcp mirror in case the edge firewall blocks this path.
      GET: async ({ request }) => {
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/event-stream")) return handleMcpHttp(request);
        return mcpInfoResponse("/api/mcp");
      },
      POST: async ({ request }) => handleMcpHttp(request),
      DELETE: async ({ request }) => handleMcpHttp(request),
    },
  },
});
