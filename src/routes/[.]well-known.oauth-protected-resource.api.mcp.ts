import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  discoveryResponse,
  protectedResourceMetadata,
} from "@/lib/oauth/mcp-oauth.server";

// RFC 9728 path-aware location. The MCP resource lives at /api/mcp, so modern
// clients (Claude, Cursor, VS Code, Codex) probe
// /.well-known/oauth-protected-resource/api/mcp first. Serving this prevents
// the 404 that aborts the OAuth handshake before it begins.
export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => discoveryResponse(protectedResourceMetadata()),
    },
  },
});
