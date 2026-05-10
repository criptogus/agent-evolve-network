import { createHash, randomBytes } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): { token: string; prefix: string } {
  const raw = "sas_" + randomBytes(24).toString("base64url");
  return { token: raw, prefix: raw.slice(0, 10) };
}
