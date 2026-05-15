import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  authorizationServerMetadata,
  discoveryResponse,
} from "@/lib/oauth/mcp-oauth.server";

// Path-aware RFC 8414 fallback. Some MCP clients append the resource path to
// the authorization-server well-known URL too; serve the same metadata so
// discovery never 404s regardless of which convention the client follows.
export const Route = createFileRoute("/.well-known/oauth-authorization-server/api/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(authorizationServerMetadata()),
    },
  },
});
