import { createHmac, timingSafeEqual } from "node:crypto";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function diagnosisCapability(id: string, secret: string): string {
  if (!secret || !UUID.test(id)) throw new Error("Invalid diagnosis capability configuration");
  return `${id}.${createHmac("sha256", secret).update(`anonymous-diagnosis:${id}`).digest("hex")}`;
}
export function diagnosisId(reference: string): string | null {
  const id = reference.split(".")[0];
  return UUID.test(id) ? id : null;
}
export function canAccessDiagnosis(
  ownerId: string | null,
  userId: string | null,
  reference: string,
  secret: string,
): boolean {
  if (ownerId !== null) return ownerId === userId;
  const id = diagnosisId(reference);
  if (!id || !secret) return false;
  const expected = Buffer.from(diagnosisCapability(id, secret));
  const supplied = Buffer.from(reference);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
