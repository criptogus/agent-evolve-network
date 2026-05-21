import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { corsPreflight, jsonResponse, oauthError } from "@/lib/oauth/mcp-oauth.server";

// RFC 8252 (OAuth for Native Apps) permits three redirect_uri shapes:
//   1. https:// (web / claimed-https)
//   2. loopback http (http://127.0.0.1, http://[::1], http://localhost)
//   3. private-use URI schemes registered by the native app (e.g. cursor://,
//      vscode://, claude://, codex://, lovable://, hermes://, openclaw://)
// Many MCP clients (Cursor, VS Code, Claude Desktop dev builds) advertise
// scheme-style redirects, so rejecting them forced users into the broken
// "loopback page that doesn't exist" failure mode.
const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const RedirectUri = z
  .string()
  .min(3)
  .max(2000)
  .refine((u) => {
    if (u.startsWith("https://")) return true;
    if (
      u.startsWith("http://localhost") ||
      u.startsWith("http://127.0.0.1") ||
      u.startsWith("http://[::1]")
    ) {
      return true;
    }
    // Private-use URI scheme: must contain a dot in the scheme per RFC 8252
    // §7.1 (e.g. com.example.app:/oauth) OR be a known MCP client scheme.
    if (!SCHEME.test(u)) return false;
    if (u.startsWith("http://")) return false; // non-loopback plain http forbidden
    return true;
  }, "redirect_uri must use https, loopback http, or a private-use URI scheme (RFC 8252)");

const RegisterSchema = z.object({
  client_name: z.string().min(1).max(120).optional(),
  redirect_uris: z.array(RedirectUri).min(1).max(10),
  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  software_id: z.string().max(120).optional(),
  software_version: z.string().max(60).optional(),
  // Accepted-but-ignored fields the spec allows clients to send
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/api/public/oauth/register")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return oauthError("invalid_request", "Body must be JSON");
        }
        const parsed = RegisterSchema.safeParse(body);
        if (!parsed.success) {
          return oauthError(
            "invalid_redirect_uri",
            parsed.error.issues.map((i) => i.message).join("; "),
          );
        }
        const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? null;
        const { data, error } = await supabaseAdmin.rpc("mcp_oauth_register_client", {
          _client_name: parsed.data.client_name ?? "MCP Client",
          _redirect_uris: parsed.data.redirect_uris,
          _client_uri: parsed.data.client_uri ?? null,
          _logo_uri: parsed.data.logo_uri ?? null,
          _software_id: parsed.data.software_id ?? null,
          _software_version: parsed.data.software_version ?? null,
          _ip: ip,
        } as never);
        if (error) {
          return oauthError("invalid_client_metadata", error.message);
        }
        return jsonResponse(data, 201);
      },
    },
  },
});
