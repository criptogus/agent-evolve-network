import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  discoveryResponse,
  protectedResourceMetadata,
} from "@/lib/oauth/mcp-oauth.server";

// RFC 9728 — protected resource metadata at the origin root. Keep the body
// in sync via the shared builder in mcp-oauth.server.ts.
export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(protectedResourceMetadata()),
    },
  },
});
