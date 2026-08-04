import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAgentKpis } from "@/lib/admin/agent-kpis.functions";

export const Route = createFileRoute("/admin/agent-kpis")({
  head: () => ({
    meta: [
      { title: "KPIs agent-first — Admin" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Painel administrativo com métricas de agente: tool calls via MCP, installs, execuções, onboarding verificado e diagnósticos.",
      },
    ],
  }),
  component: AgentKpisPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-xl font-semibold">Could not load the KPIs</h1>
      <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-xl font-semibold">Panel not found</h1>
    </main>
  ),
});

const RANGES = [7, 30, 90] as const;

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function AgentKpisPage() {
  const [days, setDays] = useState<number>(30);
  const fetchKpis = useServerFn(getAgentKpis);

  const kpis = useQuery({
    queryKey: ["admin-agent-kpis", days],
    queryFn: () => fetchKpis({ data: { days } }),
  });

  const t = kpis.data?.totals;
  const maxDaily = Math.max(1, ...(kpis.data?.daily.map((d) => d.tool_calls) ?? [1]));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KPIs agent-first</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agent metrics only. Pageviews are deliberately excluded.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                days === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {kpis.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Carregando…</p> : null}

      {t ? (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Tool calls (MCP)" value={t.tool_calls} hint={`${t.write_calls} de escrita`} />
            <Metric label="Distinct agents" value={t.distinct_identities} />
            <Metric label="Installs" value={t.installs} />
            <Metric label="Execuções reportadas" value={t.executions} hint={`${t.executions_ok} ok`} />
            <Metric label="Tarefas concluídas" value={t.tasks_completed} />
            <Metric label="Diagnósticos" value={t.diagnoses} />
            <Metric label="Agents built" value={t.agents_built} />
            <Metric
              label="Onboarding completo"
              value={`${t.onboarding_completed}/${t.onboarding_sessions}`}
              hint="sessões que provaram todos os passos"
            />
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Onboarding verificado por passo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada linha só conta quando o servidor validou a evidência do passo.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Passo</th>
                    <th className="py-2">Stage</th>
                    <th className="py-2">Sessões</th>
                    <th className="py-2">Retenção vs. 1º passo</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.data!.onboarding_funnel.map((row, i) => {
                    const first = kpis.data!.onboarding_funnel[0]?.sessions ?? 0;
                    const pct = first > 0 ? Math.round((row.sessions / first) * 100) : 0;
                    return (
                      <tr key={row.step_id} className="border-t border-border">
                        <td className="py-2 font-mono">{i + 1}. {row.step_id}</td>
                        <td className="py-2 text-muted-foreground">{row.stage}</td>
                        <td className="py-2 tabular-nums">{row.sessions}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded bg-muted">
                              <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="tabular-nums text-muted-foreground">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">Tools mais chamadas</h2>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Tool</th>
                    <th className="py-2">Calls</th>
                    <th className="py-2">Agentes</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.data!.top_tools.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 text-muted-foreground">
                        Nenhuma chamada no período.
                      </td>
                    </tr>
                  ) : (
                    kpis.data!.top_tools.map((row) => (
                      <tr key={row.tool_name} className="border-t border-border">
                        <td className="py-2 font-mono">{row.tool_name}</td>
                        <td className="py-2 tabular-nums">{row.calls}</td>
                        <td className="py-2 tabular-nums">{row.identities}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Atividade diária</h2>
              <div className="mt-4 flex h-40 items-end gap-1">
                {kpis.data!.daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.tool_calls} calls, ${d.executions} execuções`}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (d.tool_calls / maxDaily) * 100)}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Altura = tool calls por dia (últimos {days} dias).
              </p>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
