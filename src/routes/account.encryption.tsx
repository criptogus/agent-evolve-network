import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getEncryptionStatus,
  enableTenantEncryption,
  rotateTenantKey,
  revokeTenantKey,
  listEncryptedObjects,
  putEncryptedObject,
  readEncryptedObject,
  deleteEncryptedObject,
} from "@/lib/tenant-crypto/keys.functions";

export const Route = createFileRoute("/account/encryption")({
  head: () => ({
    meta: [
      { title: "Per-Tenant Encryption (BYOK) — Super Agent Skill" },
      {
        name: "description",
        content:
          "Enable per-tenant encryption at rest with customer-managed keys (BYOK/CMEK): AES-256-GCM, envelope encryption, rotation, and auditable crypto-shredding.",
      },
      { property: "og:title", content: "Per-tenant encryption with customer keys" },
      {
        property: "og:description",
        content:
          "Generate your root key, encrypt proprietary skills with AES-256-GCM, and keep the platform unable to read them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EncryptionPage,
});

function generateRootKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function EncryptionPage() {
  const status = useServerFn(getEncryptionStatus);
  const enable = useServerFn(enableTenantEncryption);
  const rotate = useServerFn(rotateTenantKey);
  const revoke = useServerFn(revokeTenantKey);
  const list = useServerFn(listEncryptedObjects);
  const put = useServerFn(putEncryptedObject);
  const read = useServerFn(readEncryptedObject);
  const del = useServerFn(deleteEncryptedObject);
  const qc = useQueryClient();

  const [rootKey, setRootKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [ref, setRef] = useState("");
  const [content, setContent] = useState("");
  const [decrypted, setDecrypted] = useState<{ ref: string; content: string; integrityOk: boolean } | null>(null);

  const statusQ = useQuery({ queryKey: ["tenant-encryption"], queryFn: () => status() });
  const objectsQ = useQuery({
    queryKey: ["tenant-encrypted-objects"],
    queryFn: () => list(),
    enabled: Boolean(statusQ.data?.enabled),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tenant-encryption"] });
    qc.invalidateQueries({ queryKey: ["tenant-encrypted-objects"] });
  };
  const fail = (e: any) => toast.error(String(e?.message ?? "Failed").replace(/^Error:\s*/, ""));

  const enableMut = useMutation({
    mutationFn: () => enable({ data: { rootKey: rootKey.trim() } }),
    onSuccess: (r) => {
      toast.success(`Encryption enabled · fingerprint ${r.fingerprint}…`);
      refresh();
    },
    onError: fail,
  });
  const rotateMut = useMutation({
    mutationFn: () => rotate({ data: { currentRootKey: rootKey.trim(), newRootKey: newKey.trim() } }),
    onSuccess: (r) => {
      toast.success(`Key rotated · ${r.fingerprint}…`);
      setRootKey(newKey.trim());
      setNewKey("");
      refresh();
    },
    onError: fail,
  });
  const revokeMut = useMutation({
    mutationFn: (purge: boolean) => revoke({ data: { confirm: "SHRED", purgeObjects: purge } }),
    onSuccess: () => {
      toast.success("Key destroyed (crypto-shredding)");
      refresh();
    },
    onError: fail,
  });
  const putMut = useMutation({
    mutationFn: () => put({ data: { rootKey: rootKey.trim(), kind: "skill", ref: ref.trim(), content } }),
    onSuccess: (r) => {
      toast.success(`Encrypted · sha256 ${r.sha256.slice(0, 12)}…`);
      setContent("");
      refresh();
    },
    onError: fail,
  });
  const readMut = useMutation({
    mutationFn: (id: string) => read({ data: { rootKey: rootKey.trim(), id } }),
    onSuccess: (r) => setDecrypted({ ref: r.ref, content: r.content, integrityOk: r.integrityOk }),
    onError: fail,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Object removed");
      refresh();
    },
    onError: fail,
  });

  const enabled = Boolean(statusQ.data?.enabled);
  const keyReady = rootKey.trim().length >= 43;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Security</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Per-tenant encryption with customer key
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          AES-256-GCM envelope encryption: you generate the root key (CMK), we store only the
          fingerprint, the derivation salt, and the <em>wrapped</em> data key. Without your
          root key, neither the platform nor an operator with database access can read the content.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Zero-knowledge", "The root key is never persisted — it only exists in memory during the operation."],
            ["Rotation without reprocessing", "Rotating re-wraps the data key; the encrypted content is not touched."],
            ["Crypto-shredding", "Revoking deletes the data key: the ciphertext becomes unrecoverable."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-sm font-semibold">{t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-semibold">1. Your root key (32 bytes, base64)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated in your browser. Store it in a password manager or your own KMS — if you
            lose it, the encrypted content is unrecoverable by design.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={rootKey}
              onChange={(e) => setRootKey(e.target.value)}
              placeholder="32-byte base64"
              className="font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="button" variant="outline" onClick={() => setRootKey(generateRootKey())}>
              Generate
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!keyReady}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(rootKey.trim());
                  toast.success("Key copied");
                } catch {
                  toast.error("Copy failed");
                }
              }}
            >
              Copy
            </Button>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-semibold">2. Tenant status</h2>
          {statusQ.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : enabled ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Fingerprint:</span>{" "}
                <span className="font-mono">{statusQ.data?.key?.fingerprint}…</span>
              </p>
              <p>
                <span className="text-muted-foreground">Encrypted objects:</span>{" "}
                {statusQ.data?.objectCount}
              </p>
              <p className="text-muted-foreground">
                Active since {new Date(statusQ.data!.key!.createdAt).toLocaleString()}
                {statusQ.data?.key?.rotatedAt
                  ? ` · rotated on ${new Date(statusQ.data.key.rotatedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">
                No active key. Enable it to start encrypting proprietary content.
              </p>
              <Button
                className="mt-3"
                disabled={!keyReady || enableMut.isPending}
                onClick={() => enableMut.mutate()}
              >
                {enableMut.isPending ? "Enabling…" : "Enable per-tenant encryption"}
              </Button>
            </div>
          )}
        </section>

        {enabled && (
          <>
            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">3. Encrypt content</h2>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="reference (e.g.: my-proprietary-skill)"
                className="mt-3"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your SKILL.md, prompt, or proprietary payload here"
                className="mt-2 min-h-32 font-mono text-xs"
              />
              <Button
                className="mt-3"
                disabled={!keyReady || !ref.trim() || !content.length || putMut.isPending}
                onClick={() => putMut.mutate()}
              >
                {putMut.isPending ? "Encrypting…" : "Encrypt and store"}
              </Button>
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">4. Encrypted objects</h2>
              {objectsQ.data?.length ? (
                <ul className="mt-3 divide-y divide-border/60">
                  {objectsQ.data.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{o.ref}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.kind} · {o.byte_size} B · sha256 {o.plaintext_sha256.slice(0, 12)}…
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!keyReady || readMut.isPending}
                          onClick={() => readMut.mutate(o.id)}
                        >
                          Decrypt
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => delMut.mutate(o.id)}>
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nothing encrypted yet.</p>
              )}
              {decrypted && (
                <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">
                    {decrypted.ref} · integrity {decrypted.integrityOk ? "OK" : "FAILED"}
                  </div>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs">
                    {decrypted.content}
                  </pre>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">5. Rotation and revocation</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="new root key (base64)"
                  className="font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="button" variant="outline" onClick={() => setNewKey(generateRootKey())}>
                  Generate new
                </Button>
                <Button
                  disabled={!keyReady || newKey.trim().length < 43 || rotateMut.isPending}
                  onClick={() => rotateMut.mutate()}
                >
                  Rotate
                </Button>
              </div>
              <div className="mt-5 rounded-lg border border-destructive/40 p-3">
                <div className="text-sm font-semibold text-destructive">Destructive zone</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crypto-shredding discards the data key. All encrypted content becomes
                  mathematically unreadable — including for you.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Destroy this tenant's data key?")) revokeMut.mutate(false);
                    }}
                  >
                    Destroy key
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Destroy key AND delete all encrypted objects?")) revokeMut.mutate(true);
                    }}
                  >
                    Destroy key + objects
                  </Button>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">Audit trail</h2>
              <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
                {(statusQ.data?.events ?? []).map((e) => (
                  <li key={e.id}>
                    {new Date(e.created_at).toLocaleString()} · {e.event}
                  </li>
                ))}
                {!statusQ.data?.events?.length && <li>No events.</li>}
              </ul>
            </section>
          </>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Need an external KMS (AWS KMS / GCP KMS / HSM) and a signed NDA?{" "}
          <Link to="/enterprise" className="text-primary hover:underline">
            Talk to the Enterprise team
          </Link>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}
