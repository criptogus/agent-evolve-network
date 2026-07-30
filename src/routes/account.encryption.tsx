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
      { title: "Criptografia por tenant (BYOK) — Super Agent Skill" },
      {
        name: "description",
        content:
          "Ative criptografia em repouso por tenant com chaves geridas por você (BYOK/CMEK): AES-256-GCM, envelope encryption, rotação e crypto-shredding auditável.",
      },
      { property: "og:title", content: "Criptografia por tenant com chaves do cliente" },
      {
        property: "og:description",
        content:
          "Gere sua chave-raiz, cifre skills proprietários com AES-256-GCM e mantenha a plataforma sem capacidade de leitura.",
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
  const fail = (e: any) => toast.error(String(e?.message ?? "Falhou").replace(/^Error:\s*/, ""));

  const enableMut = useMutation({
    mutationFn: () => enable({ data: { rootKey: rootKey.trim() } }),
    onSuccess: (r) => {
      toast.success(`Criptografia ativada · fingerprint ${r.fingerprint}…`);
      refresh();
    },
    onError: fail,
  });
  const rotateMut = useMutation({
    mutationFn: () => rotate({ data: { currentRootKey: rootKey.trim(), newRootKey: newKey.trim() } }),
    onSuccess: (r) => {
      toast.success(`Chave rotacionada · ${r.fingerprint}…`);
      setRootKey(newKey.trim());
      setNewKey("");
      refresh();
    },
    onError: fail,
  });
  const revokeMut = useMutation({
    mutationFn: (purge: boolean) => revoke({ data: { confirm: "SHRED", purgeObjects: purge } }),
    onSuccess: () => {
      toast.success("Chave destruída (crypto-shredding)");
      refresh();
    },
    onError: fail,
  });
  const putMut = useMutation({
    mutationFn: () => put({ data: { rootKey: rootKey.trim(), kind: "skill", ref: ref.trim(), content } }),
    onSuccess: (r) => {
      toast.success(`Cifrado · sha256 ${r.sha256.slice(0, 12)}…`);
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
      toast.success("Objeto removido");
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
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Segurança</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Criptografia por tenant com chave do cliente
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Envelope encryption AES-256-GCM: você gera a chave-raiz (CMK), nós guardamos apenas a
          impressão digital, o sal de derivação e a chave de dados <em>embrulhada</em>. Sem a sua
          chave-raiz, nem a plataforma nem um operador com acesso ao banco consegue ler o conteúdo.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Zero-knowledge", "A chave-raiz nunca é persistida — só existe em memória durante a operação."],
            ["Rotação sem reprocesso", "Rotacionar re-embrulha a chave de dados; o conteúdo cifrado não é tocado."],
            ["Crypto-shredding", "Revogar apaga a chave de dados: o ciphertext torna-se irrecuperável."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-sm font-semibold">{t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-semibold">1. Sua chave-raiz (32 bytes, base64)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerada no seu navegador. Guarde num gerenciador de senhas ou KMS próprio — se você
            perder, o conteúdo cifrado é irrecuperável por design.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={rootKey}
              onChange={(e) => setRootKey(e.target.value)}
              placeholder="base64 de 32 bytes"
              className="font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="button" variant="outline" onClick={() => setRootKey(generateRootKey())}>
              Gerar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!keyReady}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(rootKey.trim());
                  toast.success("Chave copiada");
                } catch {
                  toast.error("Cópia falhou");
                }
              }}
            >
              Copiar
            </Button>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-semibold">2. Estado do tenant</h2>
          {statusQ.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
          ) : enabled ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Fingerprint:</span>{" "}
                <span className="font-mono">{statusQ.data?.key?.fingerprint}…</span>
              </p>
              <p>
                <span className="text-muted-foreground">Objetos cifrados:</span>{" "}
                {statusQ.data?.objectCount}
              </p>
              <p className="text-muted-foreground">
                Ativa desde {new Date(statusQ.data!.key!.createdAt).toLocaleString()}
                {statusQ.data?.key?.rotatedAt
                  ? ` · rotacionada em ${new Date(statusQ.data.key.rotatedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">
                Nenhuma chave ativa. Ative para começar a cifrar conteúdo proprietário.
              </p>
              <Button
                className="mt-3"
                disabled={!keyReady || enableMut.isPending}
                onClick={() => enableMut.mutate()}
              >
                {enableMut.isPending ? "Ativando…" : "Ativar criptografia por tenant"}
              </Button>
            </div>
          )}
        </section>

        {enabled && (
          <>
            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">3. Cifrar conteúdo</h2>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="referência (ex.: meu-skill-proprietario)"
                className="mt-3"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole aqui o SKILL.md, prompt ou payload proprietário"
                className="mt-2 min-h-32 font-mono text-xs"
              />
              <Button
                className="mt-3"
                disabled={!keyReady || !ref.trim() || !content.length || putMut.isPending}
                onClick={() => putMut.mutate()}
              >
                {putMut.isPending ? "Cifrando…" : "Cifrar e armazenar"}
              </Button>
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">4. Objetos cifrados</h2>
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
                          Decifrar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => delMut.mutate(o.id)}>
                          Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nada cifrado ainda.</p>
              )}
              {decrypted && (
                <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">
                    {decrypted.ref} · integridade {decrypted.integrityOk ? "OK" : "FALHOU"}
                  </div>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs">
                    {decrypted.content}
                  </pre>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">5. Rotação e revogação</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="nova chave-raiz (base64)"
                  className="font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="button" variant="outline" onClick={() => setNewKey(generateRootKey())}>
                  Gerar nova
                </Button>
                <Button
                  disabled={!keyReady || newKey.trim().length < 43 || rotateMut.isPending}
                  onClick={() => rotateMut.mutate()}
                >
                  Rotacionar
                </Button>
              </div>
              <div className="mt-5 rounded-lg border border-destructive/40 p-3">
                <div className="text-sm font-semibold text-destructive">Zona destrutiva</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crypto-shredding descarta a chave de dados. Todo o conteúdo cifrado passa a ser
                  matematicamente ilegível — inclusive para você.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Destruir a chave de dados deste tenant?")) revokeMut.mutate(false);
                    }}
                  >
                    Destruir chave
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Destruir chave E apagar todos os objetos cifrados?")) revokeMut.mutate(true);
                    }}
                  >
                    Destruir chave + objetos
                  </Button>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-lg font-semibold">Trilha de auditoria</h2>
              <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
                {(statusQ.data?.events ?? []).map((e) => (
                  <li key={e.id}>
                    {new Date(e.created_at).toLocaleString()} · {e.event}
                  </li>
                ))}
                {!statusQ.data?.events?.length && <li>Sem eventos.</li>}
              </ul>
            </section>
          </>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Precisa de KMS externo (AWS KMS / GCP KMS / HSM) e NDA assinado?{" "}
          <Link to="/enterprise" className="text-primary hover:underline">
            Fale com o time Enterprise
          </Link>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}
