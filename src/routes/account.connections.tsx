import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";
import {
  listOauthConnections,
  revokeOauthConnection,
  testOauthConnection,
} from "@/lib/oauth/connections.functions";

export const Route = createFileRoute("/account/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Super Agent Skill" },
      {
        name: "description",
        content:
          "Manage MCP clients (Claude, Cursor, Codex, Lovable, …) that you have authorized to call Super Agent Skill on your behalf.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const list = useServerFn(listOauthConnections);
  const revoke = useServerFn(revokeOauthConnection);
  const test = useServerFn(testOauthConnection);
  const qc = useQueryClient();
  const [tests, setTests] = useState<
    Record<string, { ok: boolean; reason?: string; last_used?: string | null }>
  >({});

  const q = useQuery({ queryKey: ["mcp-connections"], queryFn: () => list() });
  const revokeMut = useMutation({
    mutationFn: (client_id: string) => revoke({ data: { client_id } }),
    onSuccess: (r) => {
      toast.success(`Revoked ${r.revoked} token${r.revoked === 1 ? "" : "s"}.`);
      qc.invalidateQueries({ queryKey: ["mcp-connections"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Revoke failed"),
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Connections</h1>
        <p className="mt-2 text-muted-foreground">
          MCP clients you've authorized via OAuth. Revoking signs the client out — it'll need to
          reconnect to call your tools again. For machine-to-machine credentials see{" "}
          <Link to="/account/tokens" className="text-primary hover:underline">
            API tokens
          </Link>
          .
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Authorized clients
          </div>
          {q.isLoading && <div className="p-5 text-sm text-muted-foreground">Loading…</div>}
          {q.isError && (
            <div className="p-5 text-sm">
              <span className="text-destructive">Sign in to manage connections.</span>{" "}
              <Link to="/login" className="text-primary">Sign in →</Link>
            </div>
          )}
          {q.data && q.data.items.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">
              No OAuth connections yet. Open your MCP client (Claude, Cursor, Codex, Lovable…) and
              paste{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
                https://superagentskill.com/api/mcp
              </code>
              . The client will open a browser window to authorize you.
            </div>
          )}
          {q.data && q.data.items.length > 0 && (
            <ul className="divide-y divide-border/60">
              {q.data.items.map((c) => (
                <li
                  key={c.client_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{c.client_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {c.client_id}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.active_access} active · scopes:{" "}
                      <span className="font-mono">{c.scope}</span> · granted{" "}
                      {new Date(c.first_granted).toLocaleDateString()}
                      {c.last_used && ` · last used ${new Date(c.last_used).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tests[c.client_id] && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          tests[c.client_id].ok ? "text-signal" : "text-destructive"
                        }`}
                      >
                        {tests[c.client_id].ok ? "✓ live" : `✗ ${tests[c.client_id].reason}`}
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        const r = await test({ data: { client_id: c.client_id } });
                        setTests((p) => ({ ...p, [c.client_id]: r }));
                        if (r.ok) toast.success(`${c.client_name} is connected.`);
                        else toast.error(`${c.client_name}: ${r.reason ?? "no live token"}`);
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => revokeMut.mutate(c.client_id)}
                      disabled={revokeMut.isPending}
                      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
