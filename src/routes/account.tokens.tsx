import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMcpTokens, createMcpToken, revokeMcpToken } from "@/lib/account/tokens.functions";

export const Route = createFileRoute("/account/tokens")({
  head: () => ({
    meta: [
      { title: "API tokens — Super Agent Skill" },
      {
        name: "description",
        content:
          "Generate personal API tokens and learn how to send them in the Authorization: Bearer header to enable write tools (upload, publish, rollback).",
      },
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

  const copy = async (text: string, label = "Token") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">API tokens</h1>
        <p className="mt-2 text-muted-foreground">
          Personal tokens that authorize write tools (upload, publish, rollback, evaluate) from
          your agent, CI, or terminal. Send them as{" "}
          <code className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</code>.
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
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-emerald-500">
                  Save this token now — it won't be shown again.
                </div>
                <button
                  onClick={() => copy(fresh)}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  Copy
                </button>
              </div>
              <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-xs">
                {fresh}
              </code>
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

        {/* How to use the token */}
        <div className="mt-10 space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">How to use your token</h2>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              1. Authorization header
            </div>
            <p className="mt-3 text-muted-foreground">
              Every write endpoint expects an{" "}
              <code className="font-mono text-xs">Authorization</code> header with the Bearer
              scheme. Read-only public endpoints work without it.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`Authorization: Bearer sas_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </pre>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Token is shown once — store it in a password manager or env var.</li>
              <li>Treat it like a password: don't commit to git, don't paste in chats.</li>
              <li>Revoke immediately if it leaks; mint a new one to replace it.</li>
              <li>One token per device/agent makes auditing and rotation easier.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              2. curl
            </div>
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`export SAS_TOKEN="sas_xxxxxxxx..."

curl -X POST https://www.superagentskill.com/api/packages/upload \\
  -H "Authorization: Bearer $SAS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": [
      { "name": "triage.md", "content": "# Cardiology triage" }
    ],
    "publish": false
  }'`}
            </pre>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              3. JavaScript / fetch
            </div>
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`const res = await fetch("https://www.superagentskill.com/api/packages/upload", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.SAS_TOKEN}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ files, publish: false }),
});
if (!res.ok) throw new Error(\`Upload failed: \${res.status}\`);
const data = await res.json();`}
            </pre>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              4. MCP client config (Cursor / Claude Code / Codex / VS Code)
            </div>
            <p className="mt-3 text-muted-foreground">
              Pass the token via the <code className="font-mono text-xs">SAS_TOKEN</code> env var.
              The MCP server forwards it as the{" "}
              <code className="font-mono text-xs">Authorization</code> header on every tool call.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`{
  "mcpServers": {
    "super-agent-skill": {
      "command": "npx",
      "args": ["-y", "@superagentskill/mcp"],
      "env": { "SAS_TOKEN": "sas_xxxxxxxx..." }
    }
  }
}`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              See <Link to="/connect" className="text-primary hover:underline">/connect</Link> for
              one-click snippets per tool.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              5. Inline MCP tool call (legacy / no env)
            </div>
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
{`// Same as the /upload UI; works without env-var setup
{
  "tool": "upload_packages",
  "arguments": {
    "auth_token": "sas_xxxxxxxx...",
    "files": [
      { "name": "triage.md", "content": "# Cardiology triage" },
      { "name": "tone.md",   "content": "# Soul: warm clinician", "type": "soul" }
    ],
    "publish": false
  }
}`}
            </pre>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
            <div className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Common errors
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">401 Unauthorized</strong> — header missing or
                token revoked. Mint a new one above.
              </li>
              <li>
                <strong className="text-foreground">403 Forbidden</strong> — token valid but the
                action requires admin role or ownership.
              </li>
              <li>
                <strong className="text-foreground">Malformed header</strong> — must be exactly{" "}
                <code className="font-mono">Bearer &lt;token&gt;</code> (case-sensitive scheme,
                single space, no quotes).
              </li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
