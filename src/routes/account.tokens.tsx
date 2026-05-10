import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMcpTokens, createMcpToken, revokeMcpToken } from "@/lib/account/tokens.functions";

export const Route = createFileRoute("/account/tokens")({
  head: () => ({
    meta: [
      { title: "MCP tokens — Super Agent Skill" },
      { name: "description", content: "Mint personal MCP tokens to upload skills and call the registry from your agent." },
    ],
  }),
  component: TokensPage,
});

function TokensPage() {
  const list = useServerFn(listMcpTokens);
  const create = useServerFn(createMcpToken);
  const revoke = useServerFn(revokeMcpToken);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["mcp-tokens"], queryFn: () => list() });
  const createMut = useMutation({
    mutationFn: () => create({ data: { name: name || "Default" } }),
    onSuccess: (r) => {
      setFresh(r.token);
      setName("");
      qc.invalidateQueries({ queryKey: ["mcp-tokens"] });
    },
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-tokens"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">MCP tokens</h1>
        <p className="mt-2 text-muted-foreground">
          Personal API tokens for calling Super Agent Skill from your own agent over MCP. Required for tools that
          mutate your account (e.g. <code className="font-mono text-xs">upload_packages</code>).
        </p>

        {/* Create */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">New token</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cursor-laptop"
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {createMut.isPending ? "Minting…" : "Mint token"}
            </button>
          </div>
          {fresh && (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              <div className="font-medium text-emerald-500">Save this token now — it won't be shown again.</div>
              <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-xs">{fresh}</code>
            </div>
          )}
        </div>

        {/* List */}
        <div className="mt-8 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Active tokens
          </div>
          {q.isLoading && <div className="p-5 text-sm text-muted-foreground">Loading…</div>}
          {q.isError && (
            <div className="p-5 text-sm">
              <span className="text-destructive">Sign in to manage tokens.</span>{" "}
              <Link to="/onboarding" className="text-primary">Connect →</Link>
            </div>
          )}
          {q.data && q.data.items.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">No tokens yet.</div>
          )}
          {q.data && q.data.items.length > 0 && (
            <ul className="divide-y divide-border/60">
              {q.data.items.map((t: any) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {t.prefix}…  ·  created {new Date(t.created_at).toLocaleDateString()}
                      {t.last_used_at && ` · last used ${new Date(t.last_used_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeMut.mutate(t.id)}
                    disabled={revokeMut.isPending}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Usage */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Use it via MCP</div>
          <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`// MCP call: bulk-upload skills (parity with the /upload UI)
{
  "tool": "upload_packages",
  "arguments": {
    "auth_token": "sas_…",
    "files": [
      { "name": "triage.md", "content": "# Cardiology triage\\n…" },
      { "name": "tone.md",   "content": "# Soul: warm clinician\\n…", "type": "soul" }
    ],
    "publish": false
  }
}`}
          </pre>
        </div>
      </div>
      <Footer />
    </div>
  );
}
