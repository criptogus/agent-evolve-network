import type { Json } from "@/integrations/supabase/types";
/** Same serialization boundary used by PostgREST, with an explicit JSON result. */
export function toJson(value: unknown): Json {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError("Value cannot be represented as JSON");
  return JSON.parse(encoded) as Json;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function recordOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
