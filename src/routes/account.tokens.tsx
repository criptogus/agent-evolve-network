import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMcpTokens, createMcpToken, revokeMcpToken } from "@/lib/account/tokens.functions";
import { validateMcpToken } from "@/lib/account/tokens-validate.functions";

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
  const validate = useServerFn(validateMcpToken);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [validateInput, setValidateInput] = useState("");
  const PLACEHOLDER = "sas_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  const q = useQuery({ queryKey: ["mcp-tokens"], queryFn: () => list() });
  const trimmedName = name.trim();
  const createMut = useMutation({
    mutationFn: () => create({ data: { name: trimmedName } }),
    onSuccess: (r) => {
      setFresh(r.token);
      setName("");
      qc.invalidateQueries({ queryKey: ["mcp-tokens"] });
    },
  });
  const canMint = trimmedName.length > 0 && !createMut.isPending;
  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-tokens"] }),
  });
  const validateMut = useMutation({
    mutationFn: (token: string) => validate({ data: { token } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Token valid · ${r.name} (${r.prefix}…)`);
      else toast.error(r.reason ?? "Invalid token");
    },
    onError: (e: any) => toast.error(e?.message ?? "Validation failed"),
  });

  const copy = async (text: string, label = "Copied") => {
    const value = text.replaceAll(PLACEHOLDER, fresh ?? PLACEHOLDER);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  const tokenForValidation = (validateInput || fresh || "").trim();

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
          <p className="mt-2 text-xs text-muted-foreground">
            Give the token a name so you can recognise it later (e.g. which device or
            agent it's used from). Tokens without a name can't be minted — you'll thank
            us when you need to revoke one.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canMint) createMut.mutate();
              }}
              placeholder="e.g. cursor-laptop"
              aria-label="Token name"
              required
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button
              onClick={() => canMint && createMut.mutate()}
              disabled={!canMint}
              title={canMint ? "Mint a new token" : "Type a name first"}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMut.isPending ? "Minting…" : "Mint token"}
            </button>
          </div>
          {!trimmedName && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: a good name describes where the token will live, e.g.{" "}
              <code className="font-mono">claude-desktop</code>,{" "}
              <code className="font-mono">ci-deploy</code>, <code className="font-mono">cursor-mac</code>.
            </p>
          )}
          {fresh && (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-emerald-500">
                  Save this token now — it won't be shown again.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copy(fresh, "Token copied")}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-background"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => validateMut.mutate(fresh)}
                    disabled={validateMut.isPending}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-background disabled:opacity-50"
                  >
                    {validateMut.isPending ? "Checking…" : "Validate"}
                  </button>
                </div>
              </div>
              <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-xs">
                {fresh}
              </code>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Snippets below auto-substitute this token when you click Copy.
              </p>
            </div>
          )}
        </div>

        {/* Validate any token */}
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Validate a token
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste any token (or leave blank to use the freshly minted one above) to confirm it's
            recognized by the server.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              placeholder="sas_..."
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 font-mono text-xs"
            />
            <button
              onClick={() => {
                if (!tokenForValidation) {
                  toast.error("Paste a token or mint a new one above.");
                  return;
                }
                validateMut.mutate(tokenForValidation);
              }}
              disabled={validateMut.isPending}
              className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {validateMut.isPending ? "Checking…" : "Validate"}
            </button>
          </div>
          {validateMut.data && (
            <div
              className={`mt-3 rounded-md border p-3 text-xs ${
                validateMut.data.ok
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {validateMut.data.ok
                ? `✓ Valid token "${validateMut.data.name}" (${validateMut.data.prefix}…) — created ${new Date(validateMut.data.created_at).toLocaleDateString()}.`
                : `✗ ${validateMut.data.reason}`}
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
              <Link to="/connect" className="text-primary">Connect →</Link>
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

          <SnippetCard
            label="1. Authorization header"
            snippet={`Authorization: Bearer ${fresh ?? PLACEHOLDER}`}
            onCopy={copy}
            onValidate={() => validateMut.mutate(tokenForValidation)}
            canValidate={!!tokenForValidation}
            validatePending={validateMut.isPending}
          >
            <p className="text-muted-foreground">
              Every write endpoint expects an{" "}
              <code className="font-mono text-xs">Authorization</code> header with the Bearer
              scheme. Read-only public endpoints work without it.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Token is shown once — store it in a password manager or env var.</li>
              <li>Treat it like a password: don't commit to git, don't paste in chats.</li>
              <li>Revoke immediately if it leaks; mint a new one to replace it.</li>
              <li>One token per device/agent makes auditing and rotation easier.</li>
            </ul>
          </SnippetCard>

          <SnippetCard
            label="2. curl"
            snippet={`export SAS_TOKEN="${fresh ?? PLACEHOLDER}"

curl -X POST https://superagentskill.com/api/packages/upload \\
  -H "Authorization: Bearer $SAS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": [
      { "name": "triage.md", "content": "# Cardiology triage" }
    ],
    "publish": false
  }'`}
            onCopy={copy}
            onValidate={() => validateMut.mutate(tokenForValidation)}
            canValidate={!!tokenForValidation}
            validatePending={validateMut.isPending}
          />

          <SnippetCard
            label="3. JavaScript / fetch"
            snippet={`const res = await fetch("https://superagentskill.com/api/packages/upload", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.SAS_TOKEN}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ files, publish: false }),
});
if (!res.ok) throw new Error(\`Upload failed: \${res.status}\`);
const data = await res.json();`}
            onCopy={copy}
            onValidate={() => validateMut.mutate(tokenForValidation)}
            canValidate={!!tokenForValidation}
            validatePending={validateMut.isPending}
          />

          <SnippetCard
            label="4. MCP client config (Cursor / Claude Code / Codex / VS Code)"
            snippet={`{
  "mcpServers": {
    "super-agent-skill": {
      "command": "npx",
      "args": ["-y", "@superagentskill/mcp"],
      "env": { "SAS_TOKEN": "${fresh ?? PLACEHOLDER}" }
    }
  }
}`}
            onCopy={copy}
            onValidate={() => validateMut.mutate(tokenForValidation)}
            canValidate={!!tokenForValidation}
            validatePending={validateMut.isPending}
          >
            <p className="text-muted-foreground">
              Pass the token via the <code className="font-mono text-xs">SAS_TOKEN</code> env var.
              The MCP server forwards it as the{" "}
              <code className="font-mono text-xs">Authorization</code> header on every tool call.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              See <Link to="/connect" className="text-primary hover:underline">/connect</Link> for
              one-click snippets per tool.
            </p>
          </SnippetCard>

          <SnippetCard
            label="5. Inline MCP tool call (legacy / no env)"
            snippet={`{
  "tool": "upload_packages",
  "arguments": {
    "auth_token": "${fresh ?? PLACEHOLDER}",
    "files": [
      { "name": "triage.md", "content": "# Cardiology triage" },
      { "name": "tone.md",   "content": "# Soul: warm clinician", "type": "soul" }
    ],
    "publish": false
  }
}`}
            onCopy={copy}
            onValidate={() => validateMut.mutate(tokenForValidation)}
            canValidate={!!tokenForValidation}
            validatePending={validateMut.isPending}
          />

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

function SnippetCard({
  label,
  snippet,
  children,
  onCopy,
  onValidate,
  canValidate,
  validatePending,
}: {
  label: string;
  snippet: string;
  children?: ReactNode;
  onCopy: (text: string, label?: string) => void;
  onValidate: () => void;
  canValidate: boolean;
  validatePending: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(snippet, "Snippet copied")}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-background"
          >
            ⧉ Copy
          </button>
          <button
            onClick={onValidate}
            disabled={!canValidate || validatePending}
            title={canValidate ? "Validate the token used in this snippet" : "Mint or paste a token first"}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-background disabled:opacity-50"
          >
            {validatePending ? "Checking…" : "✓ Validate"}
          </button>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
      <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
        {snippet}
      </pre>
    </div>
  );
}
