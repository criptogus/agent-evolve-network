/** Server-only data helpers for tenant CMEK. Never import from the browser. */
export async function logKeyEvent(
  db: any,
  userId: string,
  keyId: string | null,
  event: string,
  detail: Record<string, unknown> = {},
) {
  await db.from("tenant_key_events").insert({ user_id: userId, key_id: keyId, event, detail });
}

export async function getActiveTenantKey(db: any, userId: string) {
  const { data, error } = await db
    .from("tenant_encryption_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Could not load tenant key");
  return data;
}
