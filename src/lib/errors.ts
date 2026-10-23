/** Preserve useful error fields without assuming thrown values are Error objects. */
export function errorField(
  error: unknown,
  field: "message" | "text" = "message",
): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = field in error ? Reflect.get(error, field) : undefined;
  return typeof value === "string" ? value : undefined;
}
