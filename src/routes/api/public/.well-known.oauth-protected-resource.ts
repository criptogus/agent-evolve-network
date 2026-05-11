import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN, MCP_RESOURCE, CORS_HEADERS } from "@/lib/oauth/mcp-oauth.server";

export const Route = createFileRoute("/api/public/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const body = {
          resource: MCP_RESOURCE,
          authorization_servers: [ORIGIN],
          scopes_supported: ["mcp:read", "mcp:write"],
          bearer_methods_supported: ["header"],
          resource_documentation: `${ORIGIN}/docs/mcp`,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
            ...CORS_HEADERS,
          },
        });
      },
    },
  },
});
