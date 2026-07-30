import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SitePage } from "@/components/site/SitePage";
import {
  getWorkspaceRoi,
  getSkillUplift,
  listExperiments,
  listExecutionOutcomes,
} from "@/lib/experiments/uplift.functions";


export const Route = createFileRoute("/admin/roi")({
  head: () => ({
    meta: [
      { title: "ROI & uplift por cliente — Admin" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Painel administrativo de prova de valor: uplift contrafactual skill on/off e ROI agregado por workspace.",
      },
    ],
  }),
  component: AdminRoiPage,
});

const RANGES = [7, 30, 90] as const;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function AdminRoiPage() {
  const [days, setDays] = useState<number>(30);
  const [slug, setSlug] = useState("");
  const [querySlug, setQuerySlug] = useState("");
  const [onlyWithOutcome, setOnlyWithOutcome] = useState(false);

  const fetchRoi = useServerFn(getWorkspaceRoi);
  const fetchUplift = useServerFn(getSkillUplift);
  const fetchExperiments = useServerFn(listExperiments);
  const fetchOutcomes = useServerFn(listExecutionOutcomes);

  const roi = useQuery({
    queryKey: ["admin-roi", days],
    queryFn: () => fetchRoi({ data: { days } }),
  });
  const experiments = useQuery({
    queryKey: ["admin-experiments"],
    queryFn: () => fetchExperiments(),
  });
  const uplift = useQuery({
    queryKey: ["admin-uplift", querySlug, days],
    queryFn: () => fetchUplift({ data: { slug: querySlug, days } }),
    enabled: querySlug.length > 0,
  });
  const outcomes = useQuery({
    queryKey: ["admin-outcomes", days, querySlug, onlyWithOutcome],
    queryFn: () =>
      fetchOutcomes({
        data: {
          days,
          limit: 50,
          slug: querySlug || undefined,
          onlyWithOutcome,
        },
      }),
  });


  return (
    <SitePage>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">ROI &amp; uplift por cliente</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Prova de valor ao cliente: uplift contrafactual (skill ligado vs. desligado) e
            resultado agregado por workspace anonimizado. Vazio até que execuções cheguem com
            dados de outcome (<code>task_completed</code>, <code>arm</code>).
          </p>
          <div className="flex gap-2 pt-2">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  days === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {r} dias
              </button>
            ))}
          </div>
        </header>

        {/* Totals */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roi.data
            ? [
                { label: "Execuções", value: roi.data.totals.executions.toLocaleString("pt-BR") },
                {
                  label: "Taxa de conclusão (rede)",
                  value: pct(roi.data.totals.network_completion_rate),
                },
                { label: "Horas de agente economizadas", value: `${roi.data.totals.hours_saved}h` },
                {
                  label: "Blocos de guardrail",
                  value: roi.data.totals.guardrail_blocks.toLocaleString("pt-BR"),
                },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{c.value}</div>
                </div>
              ))
            : null}
        </section>

        {/* Uplift lookup */}
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Uplift contrafactual por skill</h2>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuerySlug(slug.trim());
            }}
          >
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug do pacote, ex. code-reviewer"
              className="min-w-[16rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Medir
            </button>
          </form>

          {uplift.isLoading && querySlug ? (
            <p className="text-sm text-muted-foreground">Calculando…</p>
          ) : null}
          {uplift.data ? (
            uplift.data.has_control_arm ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label="Controle (skill off)"
                    value={pct(uplift.data.completion.control_rate)}
                    sub={`n=${uplift.data.completion.n_control}`}
                  />
                  <Stat
                    label="Tratamento (skill on)"
                    value={pct(uplift.data.completion.treatment_rate)}
                    sub={`n=${uplift.data.completion.n_treatment}`}
                  />
                  <Stat
                    label="Uplift absoluto"
                    value={`${uplift.data.completion.absolute_uplift >= 0 ? "+" : ""}${(
                      uplift.data.completion.absolute_uplift * 100
                    ).toFixed(1)} p.p.`}
                    sub={`IC95% [${(uplift.data.completion.ci_low * 100).toFixed(1)}, ${(
                      uplift.data.completion.ci_high * 100
                    ).toFixed(1)}] · p=${uplift.data.completion.p_value}`}
                  />
                </div>
                <p className="text-sm">
                  {uplift.data.completion.significant ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Estatisticamente significativo
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Ainda sem significância (precisa de mais execuções por braço)
                    </span>
                  )}{" "}
                  · autonomia (sem intervenção humana):{" "}
                  {(uplift.data.autonomy.absolute_uplift * 100).toFixed(1)} p.p.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem braço de controle para <code>{uplift.data.slug}</code> nos últimos{" "}
                {uplift.data.window_days} dias. Configure um experimento e reporte execuções com{" "}
                <code>arm</code>.
              </p>
            )
          ) : null}
        </section>

        {/* Per-execution outcome */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Outcome por execução</h2>
              <p className="text-sm text-muted-foreground">
                Valor além do pass rate: tarefa concluída, intervenção humana e latência
                economizada vs. baseline, execução por execução
                {querySlug ? (
                  <>
                    {" "}
                    (filtrado por <code>{querySlug}</code>)
                  </>
                ) : null}
                .
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyWithOutcome}
                onChange={(e) => setOnlyWithOutcome(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Só com outcome reportado
            </label>
          </div>

          {outcomes.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Cobertura de outcome"
                value={pct(outcomes.data.summary.outcome_coverage)}
                sub={`${outcomes.data.summary.with_outcome}/${outcomes.data.summary.rows} execuções`}
              />
              <Stat
                label="Tarefas concluídas"
                value={pct(outcomes.data.summary.completion_rate)}
                sub="entre execuções com outcome"
              />
              <Stat
                label="Intervenção humana"
                value={pct(outcomes.data.summary.intervention_rate)}
                sub={`👍 ${outcomes.data.summary.thumbs_up} · 👎 ${outcomes.data.summary.thumbs_down}`}
              />
              <Stat
                label="Latência economizada"
                value={`${(outcomes.data.summary.latency_saved_ms / 1000).toFixed(1)}s`}
                sub={`média ${outcomes.data.summary.avg_latency_saved_ms} ms/execução`}
              />
            </div>
          ) : null}

          {outcomes.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando execuções…</p>
          ) : null}
          {outcomes.error ? (
            <p className="text-sm text-destructive">Falha ao carregar (admin apenas).</p>
          ) : null}

          {outcomes.data?.executions.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Quando</Th>
                    <Th>Pacote</Th>
                    <Th>Braço</Th>
                    <Th>Exec</Th>
                    <Th>Tarefa concluída</Th>
                    <Th>Intervenção</Th>
                    <Th>Latência</Th>
                    <Th>Latência salva</Th>
                    <Th>Tokens salvos</Th>
                    <Th>Nota</Th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.data.executions.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </Td>
                      <Td className="font-mono text-xs">
                        {e.package_slug}
                        {e.version ? `@${e.version}` : ""}
                      </Td>
                      <Td className="text-xs">{e.arm ?? "—"}</Td>
                      <Td>{e.success ? "ok" : (e.error_kind ?? "erro")}</Td>
                      <Td>{tri(e.task_completed)}</Td>
                      <Td>{tri(e.human_intervention)}</Td>
                      <Td>{e.latency_ms != null ? `${e.latency_ms} ms` : "—"}</Td>
                      <Td
                        className={
                          e.latency_saved_ms == null
                            ? ""
                            : e.latency_saved_ms >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                        }
                      >
                        {e.latency_saved_ms != null ? `${e.latency_saved_ms} ms` : "—"}
                      </Td>
                      <Td>
                        {e.tokens_saved != null
                          ? e.tokens_saved.toLocaleString("pt-BR")
                          : "—"}
                      </Td>
                      <Td>{e.user_rating === 1 ? "👍" : e.user_rating === -1 ? "👎" : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !outcomes.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma execução{onlyWithOutcome ? " com outcome reportado" : ""} nesse período.
            </p>
          ) : null}
        </section>

        {/* Experiments */}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Experimentos</h2>
          {experiments.data?.experiments?.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Pacote</Th>
                    <Th>Chave</Th>
                    <Th>Hipótese</Th>
                    <Th>Controle</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.data.experiments.map((e: any) => (
                    <tr key={`${e.package_slug}:${e.key}`} className="border-t border-border">
                      <Td>{e.package_slug}</Td>
                      <Td>{e.key}</Td>
                      <Td className="max-w-sm truncate">{e.hypothesis ?? "—"}</Td>
                      <Td>{pct(Number(e.control_share ?? 0))}</Td>
                      <Td>{e.status}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum experimento cadastrado ainda.
            </p>
          )}
        </section>

        {/* Per-workspace ROI */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">ROI por workspace</h2>
          {roi.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          {roi.error ? (
            <p className="text-sm text-destructive">Falha ao carregar (admin apenas).</p>
          ) : null}
          {roi.data?.workspaces.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Workspace</Th>
                    <Th>Execuções</Th>
                    <Th>Conclusão</Th>
                    <Th>Intervenção humana</Th>
                    <Th>Horas salvas</Th>
                    <Th>Tokens salvos</Th>
                    <Th>Guardrails</Th>
                    <Th>👍/👎</Th>
                    <Th>Pacotes</Th>
                  </tr>
                </thead>
                <tbody>
                  {roi.data.workspaces.map((w) => (
                    <tr key={w.workspace_hash} className="border-t border-border">
                      <Td className="font-mono text-xs">{w.workspace_hash.slice(0, 12)}</Td>
                      <Td>{w.executions.toLocaleString("pt-BR")}</Td>
                      <Td>{pct(w.completion_rate)}</Td>
                      <Td>{pct(w.intervention_rate)}</Td>
                      <Td>{w.hours_saved}h</Td>
                      <Td>{w.tokens_saved.toLocaleString("pt-BR")}</Td>
                      <Td>{w.guardrail_blocks}</Td>
                      <Td>
                        {w.thumbs_up}/{w.thumbs_down}
                      </Td>
                      <Td>{w.packages_used}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !roi.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma execução com dados de outcome nesse período.
            </p>
          ) : null}
        </section>
      </div>
    </SitePage>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
