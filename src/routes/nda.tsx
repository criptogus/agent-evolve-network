import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

export const NDA_VERSION = "1.0";

export const Route = createFileRoute("/nda")({
  component: NdaPage,
  head: () => ({
    meta: [
      { title: "Acordo de Confidencialidade online · Super Agent Skill" },
      {
        name: "description",
        content:
          "Acordo mútuo de confidencialidade aceito online, com um clique — sem assinatura, sem PDF. Disponível para contas pagas do Super Agent Skill.",
      },
      { property: "og:title", content: "Acordo de Confidencialidade online · Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Aceite o acordo mútuo de confidencialidade com um clique. Sem assinatura, sem PDF. Exclusivo para contas pagas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CLAUSES: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Informação confidencial",
    body: "Todo conteúdo que você envia à plataforma — skills, souls, guardrails, prompts, datasets, telemetria e resultados de avaliação — é tratado como informação confidencial sua. O mesmo vale, na direção oposta, para relatórios, metodologia de scoring e material não público que compartilhamos com você.",
  },
  {
    n: "02",
    title: "Uso restrito",
    body: "Usamos seu conteúdo apenas para executar o serviço que você contratou: validar, avaliar, versionar, assinar e servir o pacote para os seus agentes. Nada de treinamento de modelos, republicação, revenda ou análise competitiva sobre o seu conteúdo.",
  },
  {
    n: "03",
    title: "Propriedade intelectual",
    body: "A titularidade permanece integralmente sua. Não reivindicamos propriedade, coautoria, licença de exploração comercial nem direito derivado sobre o conteúdo que você mantém privado.",
  },
  {
    n: "04",
    title: "Acesso mínimo",
    body: "O acesso humano ao conteúdo privado é restrito à equipe estritamente necessária para suporte, e somente quando você solicita. Cada acesso fica registrado em trilha de auditoria consultável.",
  },
  {
    n: "05",
    title: "Segurança",
    body: "Isolamento por tenant via RLS, criptografia em trânsito e em repouso, e opção de chaves gerenciadas por você (BYOK/CMEK) com crypto-shredding.",
  },
  {
    n: "06",
    title: "Vigência e término",
    body: "As obrigações valem enquanto a conta estiver ativa e por 3 anos após o encerramento. A pedido, apagamos o conteúdo privado e as chaves em até 30 dias.",
  },
  {
    n: "07",
    title: "Exceções",
    body: "Não é confidencial o que for público por sua escolha (pacotes publicados no marketplace), o que você já divulgou, ou o que a lei nos obrigue a revelar — nesse último caso, avisamos você antes, quando permitido.",
  },
];

function NdaPage() {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const [saving, setSaving] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);

  const meta = (user?.user_metadata ?? {}) as {
    nda_accepted_at?: string | null;
    nda_version?: string | null;
  };
  const acceptedAt = justAccepted ? new Date().toISOString() : meta.nda_accepted_at || null;
  const accepted = Boolean(acceptedAt) && (justAccepted || meta.nda_version === NDA_VERSION);
  const loading = authLoading || subLoading;

  async function accept() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { nda_accepted_at: new Date().toISOString(), nda_version: NDA_VERSION },
    });
    setSaving(false);
    if (error) {
      toast.error("Não conseguimos registrar o aceite. Tente novamente.");
      return;
    }
    setJustAccepted(true);
    toast.success("Acordo de confidencialidade aceito e registrado.");
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <header>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Aceite online · sem assinatura · contas pagas
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Acordo mútuo de confidencialidade
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Não há NDA para assinar, nem PDF para circular no jurídico. O acordo vive aqui no site e
            entra em vigor com um clique, vinculado à sua conta paga —{" "}
            <span className="font-medium text-foreground">versão {NDA_VERSION}</span>.
          </p>
        </header>

        <section className="mt-10 space-y-4">
          {CLAUSES.map((c) => (
            <article key={c.n} className="rounded-lg border border-border bg-surface p-6">
              <div className="font-mono text-xs text-primary">{c.n}</div>
              <h2 className="mt-2 font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-6 md:p-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando status da conta…</p>
          ) : !user ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Entre para aceitar</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O aceite fica registrado na sua conta, com data e hora. Faça login para continuar.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Entrar
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium"
                >
                  Ver planos
                </Link>
              </div>
            </>
          ) : accepted ? (
            <>
              <div className="inline-flex items-center gap-2 text-sm text-signal">
                <span className="size-1.5 rounded-full bg-signal" />
                <span className="font-mono uppercase tracking-wider">Acordo em vigor</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Confidencialidade ativa na sua conta
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Aceito em{" "}
                <span className="font-mono text-foreground">
                  {new Date(acceptedAt as string).toLocaleString("pt-BR")}
                </span>{" "}
                · versão {NDA_VERSION}. Nada mais é necessário — nenhum documento para assinar.
              </p>
            </>
          ) : !isActive ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight">
                Disponível para contas pagas
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A confidencialidade contratual acompanha os planos pagos. Faça upgrade e o aceite
                fica disponível imediatamente nesta página.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Fazer upgrade
                </Link>
                <Link
                  to="/security"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium"
                >
                  Ver Trust Center
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Aceitar com um clique</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ao aceitar, registramos data, hora e versão do acordo na sua conta. Vale para todo o
                conteúdo privado que você já enviou e para o que enviar depois.
              </p>
              <button
                type="button"
                onClick={accept}
                disabled={saving}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Registrando…" : "Aceitar acordo de confidencialidade"}
              </button>
            </>
          )}
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Precisa de um documento próprio, assinado pelo seu jurídico? Escreva para{" "}
          <a
            href="mailto:enterprise@superagentskill.com?subject=NDA%20personalizado"
            className="underline underline-offset-2"
          >
            enterprise@superagentskill.com
          </a>{" "}
          — atendemos casos enterprise sob demanda.
        </p>
      </main>
      <Footer />
    </div>
  );
}
