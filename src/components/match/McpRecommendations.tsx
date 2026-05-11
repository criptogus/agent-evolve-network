import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  listMcpRegistry,
  listMyMcpConnections,
  connectMcp,
  disconnectMcp,
  runMcpWithKit,
} from "@/lib/match/match.functions";

type RecMcp = {
  id: string;
  score: number;
  why: string;
  pairs_with: string[];
};

type RegistryEntry = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  description: string;
  transport: string;
  url?: string | null;
  command?: string | null;
  args?: string[];
  scopes: string[];
  env: Array<{ key: string; label: string; required: boolean; helper?: string; secret?: boolean }>;
  homepage: string;
};

export function McpRecommendations({
  recommended,
  kitSlugs,
  brief,
}: {
  recommended: RecMcp[];
  kitSlugs: string[];
  brief: string;
}) {
  const qc = useQueryClient();
  const listRegistry = useServerFn(listMcpRegistry);
  const listMine = useServerFn(listMyMcpConnections);
  const connect = useServerFn(connectMcp);
  const disconnect = useServerFn(disconnectMcp);
  const run = useServerFn(runMcpWithKit);

  const registry = useQuery({ queryKey: ["mcp-registry"], queryFn: () => listRegistry() });
  const mine = useQuery({
    queryKey: ["mcp-mine"],
    queryFn: async () => {
      try {
        return (await listMine()) as Array<{ registry_id: string; status: string }>;
      } catch {
        return [];
      }
    },
  });

  const connectedIds = new Set((mine.data ?? []).map((m) => m.registry_id));

  const [openId, setOpenId] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const connectMut = useMutation({
    mutationFn: (vars: { registry_id: string; env: Record<string, string> }) =>
      connect({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-mine"] });
      setOpenId(null);
      setEnvValues({});
    },
  });

  const disconnectMut = useMutation({
    mutationFn: (registry_id: string) => disconnect({ data: { registry_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-mine"] }),
  });

  const runMut = useMutation({
    mutationFn: (vars: { registry_id: string; prompt: string; package_slugs: string[] }) =>
      run({ data: vars }) as Promise<{ run_id: string }>,
    onSuccess: (d) => setRunMessage(`Run started — ${d.run_id.slice(0, 8)} · check Activity for live logs.`),
  });

  if (!recommended || recommended.length === 0) return null;

  const byId = new Map<string, RegistryEntry>(
    ((registry.data ?? []) as RegistryEntry[]).map((e) => [e.id, e])
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Compatible MCP servers</h3>
          <p className="text-xs text-muted-foreground">
            External tools that pair with the recommended kit. Connect once, then run together.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {recommended.length} suggested
        </span>
      </div>

      {runMessage && (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
          {runMessage}
          <Link to="/account/usage" className="ml-2 underline">
            Open activity
          </Link>
        </div>
      )}

      <ul className="grid gap-3">
        {recommended.map((r) => {
          const entry = byId.get(r.id);
          const isConnected = connectedIds.has(r.id);
          const isOpen = openId === r.id;
          return (
            <li key={r.id} className="rounded-xl border border-border/70 bg-background/50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{entry?.name ?? r.id}</p>
                    {entry?.category && (
                      <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {entry.category}
                      </span>
                    )}
                    {isConnected && (
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.why}</p>
                  {r.pairs_with?.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Pairs with: {r.pairs_with.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {r.score.toFixed(1)}
                  </span>
                  {isConnected ? (
                    <>
                      <button
                        onClick={() =>
                          runMut.mutate({
                            registry_id: r.id,
                            prompt: brief,
                            package_slugs: kitSlugs,
                          })
                        }
                        disabled={runMut.isPending}
                        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {runMut.isPending && runMut.variables?.registry_id === r.id
                          ? "Starting…"
                          : "Run with kit"}
                      </button>
                      <button
                        onClick={() => disconnectMut.mutate(r.id)}
                        className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenId(isOpen ? null : r.id);
                        setEnvValues({});
                      }}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      {isOpen ? "Cancel" : "Connect"}
                    </button>
                  )}
                </div>
              </div>

              {isOpen && entry && (
                <div className="mt-3 grid gap-3 rounded-lg border border-border/70 bg-card/50 p-3">
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span className="rounded border border-border px-1.5 py-0.5">
                      transport: {entry.transport}
                    </span>
                    {entry.scopes.map((s) => (
                      <span key={s} className="rounded border border-border px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                    <a
                      href={entry.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto underline hover:text-foreground"
                    >
                      docs ↗
                    </a>
                  </div>
                  <div className="grid gap-2">
                    {entry.env.map((f) => (
                      <label key={f.key} className="grid gap-1 text-xs">
                        <span className="font-medium">
                          {f.label}
                          {f.required && <span className="text-destructive"> *</span>}
                          <span className="ml-1 font-mono text-[10px] text-muted-foreground">{f.key}</span>
                        </span>
                        <input
                          type={f.secret ? "password" : "text"}
                          value={envValues[f.key] ?? ""}
                          onChange={(e) =>
                            setEnvValues((p) => ({ ...p, [f.key]: e.target.value }))
                          }
                          className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder={f.helper ?? (f.secret ? "••••••••" : "")}
                        />
                        {f.helper && <span className="text-[10px] text-muted-foreground">{f.helper}</span>}
                      </label>
                    ))}
                  </div>
                  {connectMut.isError && (
                    <p className="text-xs text-destructive">
                      {(connectMut.error as Error).message}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => connectMut.mutate({ registry_id: r.id, env: envValues })}
                      disabled={connectMut.isPending}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {connectMut.isPending ? "Connecting…" : "Save & connect"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
