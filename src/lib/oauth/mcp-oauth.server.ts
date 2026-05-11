import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const ORIGIN = "https://superagentskill.com";
export const MCP_RESOURCE = `${ORIGIN}/api/mcp`;
export const ACCESS_TTL_SECONDS = 60 * 60; // 1 h
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 d
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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

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
