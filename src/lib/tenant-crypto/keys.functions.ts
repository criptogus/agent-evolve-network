import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  decryptWithDek,
  encryptWithDek,
  fingerprint,
  parseRootKey,
  provisionKeyMaterial,
  rewrapDek,
  sha256Hex,
  unwrapDek,
} from "./envelope.server";
import { getActiveTenantKey, logKeyEvent } from "./keys.server";

type Ctx = { userId: string; supabase: any };

/** Public status: never returns key material. */
export const getEncryptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase: db } = context as Ctx;
    const key = await getActiveTenantKey(db, userId);
    const { count } = await db
      .from("tenant_encrypted_objects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const { data: events } = await db
      .from("tenant_key_events")
      .select("id, event, detail, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);
    return {
      enabled: Boolean(key),
      key: key
        ? {
            id: key.id as string,
            alias: key.alias as string,
            fingerprint: (key.fingerprint as string).slice(0, 16),
            createdAt: key.created_at as string,
            rotatedAt: key.rotated_at as string | null,
            shredded: !key.wrapped_dek,
          }
        : null,
      objectCount: count ?? 0,
      events: (events ?? []) as Array<{ id: string; event: string; detail: any; created_at: string }>,
    };
  });

export const enableTenantEncryption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rootKey: string; alias?: string }) => {
    if (!data?.rootKey) throw new Error("rootKey is required");
    return { rootKey: data.rootKey, alias: (data.alias ?? "primary").slice(0, 60) };
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    if (await getActiveTenantKey(db, userId)) throw new Error("ALREADY_ENABLED: rotate the key instead");
    const rootKey = parseRootKey(data.rootKey);
    const material = provisionKeyMaterial(rootKey);
    const { data: row, error } = await db
      .from("tenant_encryption_keys")
      .insert({
        user_id: userId,
        alias: data.alias,
        fingerprint: material.fingerprint,
        kdf_salt: material.kdfSalt,
        verifier: material.verifier,
        wrapped_dek: material.wrappedDek,
      })
      .select("id, fingerprint, created_at")
      .single();
    if (error) throw new Error("Could not store tenant key");
    await logKeyEvent(db, userId, row.id, "key.enabled", { fingerprint: material.fingerprint.slice(0, 16) });
    return { id: row.id as string, fingerprint: (row.fingerprint as string).slice(0, 16) };
  });

export const rotateTenantKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { currentRootKey: string; newRootKey: string }) => {
    if (!data?.currentRootKey || !data?.newRootKey) throw new Error("Both keys are required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    const key = await getActiveTenantKey(db, userId);
    if (!key) throw new Error("NOT_ENABLED");
    const current = parseRootKey(data.currentRootKey);
    const next = parseRootKey(data.newRootKey);
    if (fingerprint(current) === fingerprint(next)) throw new Error("NEW_KEY_MUST_DIFFER");
    const dek = unwrapDek(current, key);
    const material = rewrapDek(dek, next);
    const { error } = await db
      .from("tenant_encryption_keys")
      .update({
        fingerprint: material.fingerprint,
        kdf_salt: material.kdfSalt,
        verifier: material.verifier,
        wrapped_dek: material.wrappedDek,
        rotated_at: new Date().toISOString(),
      })
      .eq("id", key.id)
      .eq("user_id", userId);
    if (error) throw new Error("Rotation failed");
    await logKeyEvent(db, userId, key.id, "key.rotated", { fingerprint: material.fingerprint.slice(0, 16) });
    return { fingerprint: material.fingerprint.slice(0, 16) };
  });

/** Crypto-shredding: drops the wrapped DEK so ciphertext becomes unreadable forever. */
export const revokeTenantKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { confirm: string; purgeObjects?: boolean }) => {
    if (data?.confirm !== "SHRED") throw new Error("CONFIRMATION_REQUIRED");
    return { purgeObjects: Boolean(data.purgeObjects) };
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    const key = await getActiveTenantKey(db, userId);
    if (!key) throw new Error("NOT_ENABLED");
    if (data.purgeObjects) {
      await db.from("tenant_encrypted_objects").delete().eq("user_id", userId).eq("key_id", key.id);
    }
    const { error } = await db
      .from("tenant_encryption_keys")
      .update({ status: "revoked", wrapped_dek: null, revoked_at: new Date().toISOString() })
      .eq("id", key.id)
      .eq("user_id", userId);
    if (error) throw new Error("Revocation failed");
    await logKeyEvent(db, userId, key.id, "key.revoked", { purged: data.purgeObjects });
    return { ok: true };
  });

export const listEncryptedObjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase: db } = context as Ctx;
    const { data, error } = await db
      .from("tenant_encrypted_objects")
      .select("id, kind, ref, plaintext_sha256, byte_size, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not list encrypted objects");
    return (data ?? []) as Array<{
      id: string;
      kind: string;
      ref: string;
      plaintext_sha256: string;
      byte_size: number;
      updated_at: string;
    }>;
  });

export const putEncryptedObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rootKey: string; kind?: string; ref: string; content: string }) => {
    if (!data?.rootKey) throw new Error("rootKey is required");
    const ref = String(data.ref ?? "").trim();
    if (!ref) throw new Error("ref is required");
    if (typeof data.content !== "string" || !data.content.length) throw new Error("content is required");
    if (data.content.length > 500_000) throw new Error("CONTENT_TOO_LARGE");
    return { rootKey: data.rootKey, kind: (data.kind ?? "skill").slice(0, 40), ref: ref.slice(0, 200), content: data.content };
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    const key = await getActiveTenantKey(db, userId);
    if (!key) throw new Error("NOT_ENABLED");
    const dek = unwrapDek(parseRootKey(data.rootKey), key);
    const ciphertext = encryptWithDek(dek, data.content);
    const { data: row, error } = await db
      .from("tenant_encrypted_objects")
      .upsert(
        {
          user_id: userId,
          key_id: key.id,
          kind: data.kind,
          ref: data.ref,
          ciphertext,
          plaintext_sha256: sha256Hex(data.content),
          byte_size: Buffer.byteLength(data.content, "utf8"),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,kind,ref" },
      )
      .select("id, plaintext_sha256, byte_size")
      .single();
    if (error) throw new Error("Could not store encrypted object");
    await logKeyEvent(db, userId, key.id, "object.encrypted", { kind: data.kind, ref: data.ref });
    return { id: row.id as string, sha256: row.plaintext_sha256 as string, byteSize: row.byte_size as number };
  });

export const readEncryptedObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rootKey: string; id: string }) => {
    if (!data?.rootKey) throw new Error("rootKey is required");
    if (!data?.id) throw new Error("id is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    const key = await getActiveTenantKey(db, userId);
    if (!key) throw new Error("NOT_ENABLED");
    const { data: row, error } = await db
      .from("tenant_encrypted_objects")
      .select("id, kind, ref, ciphertext, plaintext_sha256")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row) throw new Error("OBJECT_NOT_FOUND");
    const dek = unwrapDek(parseRootKey(data.rootKey), key);
    const content = decryptWithDek(dek, row.ciphertext as string);
    const integrityOk = sha256Hex(content) === row.plaintext_sha256;
    await logKeyEvent(db, userId, key.id, "object.decrypted", { ref: row.ref, integrityOk });
    return { kind: row.kind as string, ref: row.ref as string, content, integrityOk };
  });

export const deleteEncryptedObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase: db } = context as Ctx;
    const { error } = await db.from("tenant_encrypted_objects").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error("Delete failed");
    await logKeyEvent(db, userId, null, "object.deleted", { id: data.id });
    return { ok: true };
  });
