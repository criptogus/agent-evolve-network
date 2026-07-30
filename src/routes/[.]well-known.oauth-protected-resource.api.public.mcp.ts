import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  discoveryResponse,
  protectedResourceMetadata,
} from "@/lib/oauth/mcp-oauth.server";

// RFC 9728 path-aware location for the canonical MCP resource
// (`/api/public/mcp`). Clients (Claude, Cursor, VS Code, Codex) probe
// /.well-known/oauth-protected-resource/api/public/mcp first; serving it
// prevents the 404 that aborts the OAuth handshake before it begins.
export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(protectedResourceMetadata()),
    },
  },
});
