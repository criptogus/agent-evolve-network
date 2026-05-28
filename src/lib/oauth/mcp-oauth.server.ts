import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const ORIGIN = "https://superagentskill.com";
export const MCP_RESOURCE = `${ORIGIN}/api/mcp`;
// Hosts (Claude/Hermes/Cursor) keep the access token in memory and only refresh
// when it 401s. With 7d access + 90d refresh, hosts effectively never reauthorize:
// access bearer survives a week of restarts; refresh covers a quarter.
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 d
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 d
export const CODE_TTL_SECONDS = 60 * 10; // 10 min

const ACCESS_PREFIX = "sas_at_";
const REFRESH_PREFIX = "sas_rt_";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomBase64Url(bytes: number): string {
  return base64UrlEncode(randomBytes(bytes));
}

export function generateAccessToken(): string {
  return ACCESS_PREFIX + randomBase64Url(32);
}

export function generateRefreshToken(): string {
  return REFRESH_PREFIX + randomBase64Url(32);
}

export function generateAuthCode(): string {
  return "sas_code_" + randomBase64Url(24);
}

/** PKCE: verify code_verifier against stored code_challenge (S256 only). */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || verifier.length < 43 || verifier.length > 128) return false;
  if (!/^[A-Za-z0-9\-._~]+$/.test(verifier)) return false;
  const expected = base64UrlEncode(createHash("sha256").update(verifier).digest());
  const a = Buffer.from(expected);
  const b = Buffer.from(challenge);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
  // Browser MCP clients (Claude.ai web connectors) can only read the OAuth
  // challenge if WWW-Authenticate is explicitly exposed.
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, X-MCP-Auth, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Window",
  "Access-Control-Max-Age": "86400",
};

/**
 * RFC 8414 authorization-server metadata. Served at both the bare
 * `/.well-known/oauth-authorization-server` and the path-aware
 * `/.well-known/oauth-authorization-server/api/mcp` location so every
 * client generation (Claude, Codex, Cursor, VS Code, …) finds it.
 */
export function authorizationServerMetadata() {
  return {
    issuer: ORIGIN,
    authorization_endpoint: `${ORIGIN}/oauth/authorize`,
    token_endpoint: `${ORIGIN}/api/public/oauth/token`,
    registration_endpoint: `${ORIGIN}/api/public/oauth/register`,
    revocation_endpoint: `${ORIGIN}/api/public/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp:read", "mcp:write"],
    service_documentation: `${ORIGIN}/docs/mcp`,
  };
}

/** RFC 9728 protected-resource metadata. */
export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [ORIGIN],
    scopes_supported: ["mcp:read", "mcp:write"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${ORIGIN}/docs/mcp`,
  };
}

/** Cached, CORS-enabled JSON response for the discovery documents. */
export function discoveryResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      ...CORS_HEADERS,
    },
  });
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function oauthError(error: string, description?: string, status = 400) {
  return jsonResponse({ error, error_description: description }, status);
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
