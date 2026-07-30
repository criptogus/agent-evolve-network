import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  authorizationServerMetadata,
  discoveryResponse,
} from "@/lib/oauth/mcp-oauth.server";

// Path-aware RFC 8414 fallback for the canonical `/api/public/mcp` resource.
// Some MCP clients append the resource path to the authorization-server
// well-known URL too; serve the same metadata so discovery never 404s.
export const Route = createFileRoute("/.well-known/oauth-authorization-server/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(authorizationServerMetadata()),
    },
  },
});
