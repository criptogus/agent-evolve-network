import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, GraduationCap, Loader2, Lock, Trash2 } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurriculumPlan } from "@/lib/university/university.functions";
import { DOMAINS, ERROR_CLASSES, ERROR_CLASS_LABEL, type DomainId, type ErrorClass } from "@/lib/university/types";

export const Route = createFileRoute("/curriculum")({
  validateSearch: (s: Record<string, unknown>) => ({
    diagnosis_id: typeof s.diagnosis_id === "string" ? s.diagnosis_id : undefined,
    domain: typeof s.domain === "string" ? (s.domain as DomainId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Trilha adaptativa do agente — Super Agent Skill" },
      {
        name: "description",
        content:
          "A próxima capacidade por ganho marginal: respeita pré-requisitos, conflitos e orçamento de contexto. Passado o orçamento, a trilha diz o que remover.",
      },
      { property: "og:title", content: "Trilha adaptativa, não catálogo" },
      {
        property: "og:description",
        content:
          "Currículo que ordena capacidades por ganho marginal para o seu agente — e avisa quando instalar mais piora o resultado.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://superagentskill.com/curriculum" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/curriculum" }],
  }),
  component: CurriculumPage,
});

const STATUS_STYLE: Record<string, string> = {
  now: "border-primary/50 bg-primary/5",
  later: "border-border",
  blocked: "border-amber-500/40 bg-amber-500/5",
  conflict: "border-destructive/40 bg-destructive/5",
};

function CurriculumPage() {
  const search = Route.useSearch();
  const plan = useServerFn(getCurriculumPlan);

  const [domain, setDomain] = useState<DomainId | undefined>(search.domain);
  const [failing, setFailing] = useState<ErrorClass[]>([]);
  const [installed, setInstalled] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installedList = useMemo(
    () => installed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 64),
    [installed],
  );

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await plan({
        data: {
          diagnosis_id: search.diagnosis_id,
          domain,
          failing,
          installed_skills: installedList,
        },
      });
      setResult(res);
    } catch {
      setError("Não foi possível montar a trilha agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  // Coming from /diagnose with a diagnosis id: the plan is already derivable.
  useEffect(() => {
    if (search.diagnosis_id) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.diagnosis_id]);

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Universidade de agentes
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Trilha adaptativa, não catálogo.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          O currículo ordena capacidades por <strong>ganho marginal</strong> para este agente: o que ele já
          cobre rende menos, pré-requisitos vêm antes, conflitos são penalizados. E existe um{" "}
          <strong>orçamento de contexto</strong> — passado dele, a recomendação é remover, não instalar.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          {search.diagnosis_id ? (
            <p className="text-sm text-muted-foreground">
              Usando o diagnóstico{" "}
              <code className="font-mono text-xs">{search.diagnosis_id.slice(0, 8)}…</code> como base.
            </p>
          ) : (
            <>
              <div className="text-sm font-medium">Sem diagnóstico? Diga onde dói</div>
              <p className="mt-1 text-xs text-muted-foreground">
                O ideal é começar pelo{" "}
                <Link to="/diagnose" className="text-primary underline">
                  exame de admissão
                </Link>
                . Sem ele, marque as classes de erro que você observa.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ERROR_CLASSES.map((ec) => {
                  const on = failing.includes(ec);
                  return (
                    <button
                      key={ec}
                      type="button"
                      onClick={() =>
                        setFailing((prev) => (on ? prev.filter((x) => x !== ec) : [...prev, ec]))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {ERROR_CLASS_LABEL[ec]}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDomain(domain === d.id ? undefined : d.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      domain === d.id ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="mt-5 block text-xs font-medium text-muted-foreground">
            Capacidades já instaladas (opcional)
          </label>
          <Textarea
            value={installed}
            onChange={(e) => setInstalled(e.target.value)}
            placeholder="clarify-before-acting, output-contract-discipline"
            className="mt-2 min-h-[64px] font-mono text-xs"
          />

          <Button onClick={run} disabled={busy} className="mt-4">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Montar trilha
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4 text-primary" /> Próximo passo
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  contexto {result.installed_count}/{result.context_budget}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{result.note}</p>

              {result.next ? (
                <div className="mt-4 rounded-xl border border-primary/50 bg-primary/5 p-4">
                  <div className="text-base font-semibold">{result.next.title}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{result.next.slug}</div>
                  <p className="mt-2 text-sm">{result.next.summary}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{result.next.why}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {result.next.fixes.map((f: ErrorClass) => (
                      <span key={f} className="rounded-full border border-border px-2 py-0.5">
                        {ERROR_CLASS_LABEL[f]}
                      </span>
                    ))}
                  </div>
                  {result.next.in_registry && (
                    <Button asChild size="sm" className="mt-4">
                      <Link to="/marketplace" search={{ q: result.next.slug } as never}>
                        Ver no marketplace <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm">
                  Nada a instalar agora — o ganho marginal de qualquer adição está abaixo do custo de
                  contexto.
                </p>
              )}
            </div>

            {!!result.track?.length && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Trilha completa (ordenada por ganho marginal)</h2>
                <ol className="mt-4 space-y-3">
                  {result.track.map((c: any, i: number) => (
                    <li key={c.slug} className={`rounded-xl border p-4 ${STATUS_STYLE[c.status] ?? "border-border"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="text-sm font-medium">{c.title}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{c.slug}</span>
                        <span className="ml-auto font-mono text-xs text-primary">
                          ganho {c.marginal_gain}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{c.why}</p>
                      {!!c.missing_prerequisites?.length && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                          <Lock className="h-3.5 w-3.5" /> requer antes: {c.missing_prerequisites.join(", ")}
                        </p>
                      )}
                      {!!c.conflicts_with?.length && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> conflita com: {c.conflicts_with.join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!!result.remove_suggestions?.length && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Trash2 className="h-4 w-4" /> Remova antes de adicionar
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {result.remove_suggestions.map((r: any) => (
                    <li key={r.slug}>
                      <span className="font-mono text-xs">{r.slug}</span> — {r.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </SitePage>
  );
}
