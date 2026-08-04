import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Award, CheckCircle2, Dumbbell, Loader2, Search, XCircle } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  issueCredentialFn,
  startResidencyFn,
  submitResidencyRoundFn,
} from "@/lib/university/residency.functions";
import { DOMAINS, ERROR_CLASSES, ERROR_CLASS_LABEL, type DomainCategory, type DomainId, type ErrorClass } from "@/lib/university/types";

export const Route = createFileRoute("/residency")({
  head: () => ({
    meta: [
      { title: "Residência do agente — treino com feedback | SAK" },
      {
        name: "description",
        content:
          "Rodadas curtas de casos focados na classe de erro que trava o seu agente, com feedback por caso e barra de aprovação. Ao se formar, o agente recebe uma credencial portável e verificável.",
      },
      { property: "og:title", content: "Residência: o agente treina, não só baixa skill" },
      {
        property: "og:description",
        content:
          "Treino determinístico por classe de erro, feedback por caso e credencial assinada ao final da residência.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://superagentskill.com/residency" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/residency" }],
  }),
  component: ResidencyPage,
});

const CATEGORY_ORDER: DomainCategory[] = ["Fundação", "Receita", "Execução", "Operações", "Mídia & Produto"];

type Task = { case_id: string; prompt: string; output_contract?: string; drills: ErrorClass };

function ResidencyPage() {
  const start = useServerFn(startResidencyFn);
  const submitRound = useServerFn(submitResidencyRoundFn);
  const issue = useServerFn(issueCredentialFn);

  const [domain, setDomain] = useState<DomainId>("gtm");
  const [focus, setFocus] = useState<ErrorClass[]>([]);
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<{ id: string | null; round: number; total: number; tasks: Task[] } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [credential, setCredential] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const map = new Map<DomainCategory, typeof DOMAINS>();
    for (const d of DOMAINS) {
      if (q && !`${d.name} ${d.blurb} ${d.id}`.toLowerCase().includes(q)) continue;
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return CATEGORY_ORDER.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter((g) => g.items.length);
  }, [query]);

  const brief = useMemo(() => {
    if (!session) return "";
    return [
      `Rodada ${session.round} de ${session.total} — execute cada caso como pedido real do usuário.`,
      "Devolva um único JSON: array de { case_id, answer }.",
      "",
      ...session.tasks.map(
        (t, i) =>
          `### ${i + 1}. ${t.case_id} (treina: ${ERROR_CLASS_LABEL[t.drills]})\n${t.prompt}${
            t.output_contract ? `\nContrato de saída: ${t.output_contract}` : ""
          }`,
      ),
    ].join("\n");
  }, [session]);

  function toggleFocus(ec: ErrorClass) {
    setFocus((prev) => (prev.includes(ec) ? prev.filter((x) => x !== ec) : [...prev, ec]));
  }

  async function onStart() {
    setBusy(true);
    setError(null);
    setResult(null);
    setCredential(null);
    setTranscript("");
    try {
      const res: any = await start({ data: { domain, focus } });
      setSession({ id: res.residency_id, round: res.round, total: res.total_rounds, tasks: res.tasks });
    } catch {
      setError("Não foi possível iniciar a residência agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!session?.id) {
      setError("Esta residência não foi persistida — reinicie para receber um residency_id.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(transcript);
      } catch {
        setError("O transcript precisa ser um JSON válido: array de { case_id, answer }.");
        setBusy(false);
        return;
      }
      const answers = Array.isArray(parsed) ? parsed : parsed?.answers;
      if (!Array.isArray(answers) || !answers.length) {
        setError("Nenhuma resposta encontrada no JSON.");
        setBusy(false);
        return;
      }
      const res: any = await submitRound({
        data: {
          residency_id: session.id,
          answers: answers.slice(0, 24).map((a: any) => ({
            case_id: String(a.case_id ?? ""),
            answer: String(a.answer ?? "").slice(0, 20000),
          })),
        },
      });
      setResult(res);
      setTranscript("");
      if (res.next_round) {
        setSession({ id: session.id, round: res.next_round.round, total: res.next_round.total_rounds, tasks: res.next_round.tasks });
      }
    } catch {
      setError("Falha ao corrigir a rodada. Verifique os case_id enviados.");
    } finally {
      setBusy(false);
    }
  }

  async function onIssue() {
    if (!session?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res: any = await issue({ data: { residency_id: session.id } });
      setCredential(res);
    } catch {
      setError("A credencial só é emitida depois de aprovar todas as rodadas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Universidade de agentes · Pilar 3
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Residência: o agente treina até acertar.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Diagnóstico aponta o gargalo; residência corrige. São rodadas curtas de casos da mesma classe de
          erro, com <strong>feedback caso a caso</strong> e barra de aprovação. Reprovou? Repete a rodada com
          o coach aplicado. Passou nas três? Sai com{" "}
          <Link to="/credential/$code" params={{ code: "SAK-EXEMPLO" }} className="text-primary underline">
            credencial portável
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Não fez o diagnóstico ainda?{" "}
          <Link to="/diagnose" className="text-primary underline">
            Comece pelo exame de admissão
          </Link>
          .
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Dumbbell className="h-4 w-4 text-primary" /> 1. Domínio e foco do treino
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar domínio (ex: vendas, pricing, ads...)"
              className="pl-9"
            />
          </div>

          <div className="mt-4 space-y-5">
            {grouped.map((g) => (
              <div key={g.category}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.category}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDomain(d.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        domain === d.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{d.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-muted-foreground">
              Classes de erro a treinar (opcional — o padrão treina o domínio inteiro)
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ERROR_CLASSES.map((ec) => (
                <button
                  key={ec}
                  type="button"
                  onClick={() => toggleFocus(ec)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    focus.includes(ec) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {ERROR_CLASS_LABEL[ec]}
                </button>
              ))}
            </div>
          </div>

          <Button className="mt-5" onClick={onStart} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Iniciar residência
          </Button>
        </section>

        {session ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">
                2. Rodada {session.round} de {session.total} — {session.tasks.length} casos
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {session.id ? `residency_id: ${session.id}` : "sessão não persistida"}
              </div>
            </div>
            <div className="mt-4">
              <CodeBlock code={brief} lang="markdown" />
            </div>
            <label className="mt-5 block text-xs font-medium text-muted-foreground">
              Cole o transcript do agente (JSON: array de {"{"} case_id, answer {"}"})
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="mt-2 font-mono text-xs"
              placeholder='[{"case_id":"gtm-01","answer":"..."}]'
            />
            <Button className="mt-4" onClick={onSubmit} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Corrigir rodada
            </Button>
          </section>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {result ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Rodada {result.round}: {result.score}%{" "}
                <span className={result.passed ? "text-primary" : "text-destructive"}>
                  {result.passed ? "aprovada" : `reprovada (mínimo ${result.pass_threshold}%)`}
                </span>
              </h2>
              <div className="text-xs text-muted-foreground">
                Score da residência: {result.residency_score}/100
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{result.next_step}</p>

            <ul className="mt-4 space-y-3">
              {result.feedback.map((f: any) => (
                <li key={f.case_id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {f.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono text-xs">{f.case_id}</span>
                    <span className="text-xs text-muted-foreground">· {f.label}</span>
                  </div>
                  <p className="mt-1 text-sm">{f.reason}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.coach}</p>
                </li>
              ))}
            </ul>

            {result.graduated ? (
              <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Award className="h-4 w-4 text-primary" /> Residência concluída
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Emita a credencial assinada: qualquer pessoa pode verificar o código sem acessar sua conta.
                </p>
                <Button className="mt-3" onClick={onIssue} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Emitir credencial
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {credential ? (
          <section className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <h2 className="text-lg font-semibold">Credencial {credential.code}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Score {credential.score}/100 · {credential.rounds} rodadas · válida até{" "}
              {new Date(credential.expires_at).toLocaleDateString("pt-BR")}
            </p>
            <div className="mt-3">
              <CodeBlock code={credential.badge_markdown} lang="markdown" />
            </div>
            <Link
              to="/credential/$code"
              params={{ code: credential.code }}
              className="mt-3 inline-block text-sm text-primary underline"
            >
              Abrir página pública de verificação
            </Link>
          </section>
        ) : null}
      </main>
    </SitePage>
  );
}
