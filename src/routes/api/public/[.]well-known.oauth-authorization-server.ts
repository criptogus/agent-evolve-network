import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN, CORS_HEADERS } from "@/lib/oauth/mcp-oauth.server";

export const Route = createFileRoute("/api/public/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const body = {
          issuer: ORIGIN,
          authorization_endpoint: `${ORIGIN}/oauth/authorize`,
          token_endpoint: `${ORIGIN}/api/public/oauth/token`,
          registration_endpoint: `${ORIGIN}/api/public/oauth/register`,
          revocation_endpoint: `${ORIGIN}/api/public/oauth/revoke`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: ["mcp:read", "mcp:write"],
          service_documentation: `${ORIGIN}/docs/mcp`,
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
