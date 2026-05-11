import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Nav } from "@/components/site/Nav";
import { useAuth } from "@/hooks/use-auth";
import { getOauthClient, issueOauthCode } from "@/lib/oauth/mcp-oauth.functions";

const ParamsSchema = z.object({
  client_id: z.string().min(3),
  redirect_uri: z.string().min(3),
  response_type: z.literal("code"),
  code_challenge: z.string().min(32),
  code_challenge_method: z.literal("S256"),
  scope: z.string().optional(),
  state: z.string().optional(),
});

export const Route = createFileRoute("/oauth/authorize")({
  validateSearch: (s: Record<string, unknown>) => ParamsSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Authorize MCP client — Super Agent Skill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthorizePage,
});

function AuthorizePage() {
  const params = Route.useSearch();
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const fetchClient = useServerFn(getOauthClient);
  const consent = useServerFn(issueOauthCode);

  const [client, setClient] = useState<
    | { client_id: string; client_name: string; redirect_uris: string[]; scope: string; client_uri?: string | null }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    fetchClient({ data: { client_id: params.client_id } })
      .then((c) => setClient(c))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"));
  }, [params.client_id, fetchClient]);

  const redirectOk = client?.redirect_uris.includes(params.redirect_uri);

  if (!loading && !user) {
    const next = `/oauth/authorize?${new URLSearchParams(params as unknown as Record<string, string>).toString()}`;
    navigate({ to: "/login", search: { next } as never });
    return null;
  }

  function buildDeniedUrl() {
    const sep = params.redirect_uri.includes("?") ? "&" : "?";
    const stateQ = params.state ? `&state=${encodeURIComponent(params.state)}` : "";
    return `${params.redirect_uri}${sep}error=access_denied${stateQ}`;
  }

  async function approve() {
    setWorking(true);
    try {
      const { redirect_to } = await consent({
        data: {
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
          scope: params.scope ?? "mcp:read mcp:write",
          state: params.state,
          code_challenge: params.code_challenge,
          code_challenge_method: "S256",
        },
      });
      window.location.href = redirect_to;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authorization failed");
      setWorking(false);
    }
  }

  function deny() {
    window.location.href = buildDeniedUrl();
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto flex min-h-[80vh] max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-elevated">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Authorize MCP client</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Connect{" "}
            <span className="text-primary">{client?.client_name ?? "this MCP client"}</span>{" "}
            to Super Agent Skill?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You're signed in as <span className="font-medium text-foreground">{user?.email}</span>. This
            client will be able to call the Super Agent Skill MCP on your behalf with the scopes below.
            You can revoke access anytime from{" "}
            <span className="font-mono text-xs">Account → Connections</span>.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Client</span>
              <span className="text-right">{client?.client_name ?? params.client_id}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Redirect</span>
              <span className="break-all text-right font-mono text-xs">{params.redirect_uri}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Scopes</span>
              <span className="text-right font-mono text-xs">
                {(params.scope ?? "mcp:read mcp:write").split(/\s+/).join(", ")}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {client && !redirectOk && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              The redirect URL is not registered for this client. Authorization blocked.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={deny}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              Deny
            </button>
            <button
              disabled={!client || !redirectOk || working}
              onClick={approve}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-50"
            >
              {working ? "Authorizing…" : "Authorize"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
