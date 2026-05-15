import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  authorizationServerMetadata,
  discoveryResponse,
} from "@/lib/oauth/mcp-oauth.server";

// RFC 8414 — authorization server metadata at the origin root. Keep the body
// in sync via the shared builder in mcp-oauth.server.ts.
export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(authorizationServerMetadata()),
    },
  },
});
