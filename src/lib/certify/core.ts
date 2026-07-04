// Pure helpers for the public certification API ("trust badge as a service").
// Kept free of Supabase/network imports so they can be unit-tested directly.

export const CERTIFY_ENGINE_VERSION = "1.0.0";

export const CERTIFIABLE_TYPES = ["skill", "playbook", "soul", "guardrail"] as const;
export type CertifiableType = (typeof CERTIFIABLE_TYPES)[number];

export const CONTENT_MIN_CHARS = 20;
export const CONTENT_MAX_CHARS = 120_000;

export interface CertificationRecord {
  id: string;
  name: string;
  type: CertifiableType;
  content_sha256: string;
  overall_score: number; // 0-100, review engine verdict axis
  grade: string; // "A — battle-ready" … "F — rewrite recommended"
  engine_version: string;
  created_at: string;
}

/** SHA-256 hex via Web Crypto — works on Cloudflare Workers and Node 18+. */
export async function sha256Hex(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CertifyRequest {
  name: string;
  type: CertifiableType;
  content: string;
}

/** Validate the POST body without zod so the contract is testable in isolation. */
export function parseCertifyRequest(
  body: unknown,
): { ok: true; value: CertifyRequest } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "body must be a JSON object" };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 200) return { ok: false, error: "name is required (1-200 chars)" };
  const type = typeof b.type === "string" ? b.type : "skill";
  if (!CERTIFIABLE_TYPES.includes(type as CertifiableType)) {
    return { ok: false, error: `type must be one of: ${CERTIFIABLE_TYPES.join(", ")}` };
  }
  const content = typeof b.content === "string" ? b.content : "";
  if (content.length < CONTENT_MIN_CHARS) {
    return {
      ok: false,
      error: `content is required (>= ${CONTENT_MIN_CHARS} chars) — pass the raw file, not a summary`,
    };
  }
  if (content.length > CONTENT_MAX_CHARS) {
    return { ok: false, error: `content too large (max ${CONTENT_MAX_CHARS} chars)` };
  }
  return { ok: true, value: { name, type: type as CertifiableType, content } };
}

/** Short value shown on the badge, e.g. "B · 84/100". */
export function badgeValue(record: Pick<CertificationRecord, "overall_score" | "grade">): string {
  const letter = record.grade.charAt(0);
  return `${letter} · ${record.overall_score}/100`;
}

export function badgeUrl(origin: string, id: string): string {
  return `${origin}/api/badges/certified/${id}.svg`;
}

export function verifyUrl(origin: string, id: string): string {
  return `${origin}/api/public/certifications/${id}`;
}

/** Markdown snippet authors paste into their README. */
export function embedMarkdown(origin: string, id: string): string {
  return `[![skill audit](${badgeUrl(origin, id)})](${verifyUrl(origin, id)})`;
}
