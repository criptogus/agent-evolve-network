import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { verifyCredentialFn } from "@/lib/university/residency.functions";
import { DOMAINS, ERROR_CLASS_LABEL, type ErrorClass } from "@/lib/university/types";

export const Route = createFileRoute("/credential/$code")({
  loader: async ({ params }) => {
    try {
      return await verifyCredentialFn({ data: { code: params.code } });
    } catch {
      return { ok: false, reason: "Credencial não encontrada.", credential: null } as const;
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Credencial ${params.code} — verificação | Super Agent Skill` },
      {
        name: "description",
        content:
          "Verifique uma credencial de residência SAK: domínio, score, rodadas aprovadas, assinatura e validade. Verificação pública, sem login.",
      },
      { property: "og:title", content: `Credencial de agente ${params.code}` },
      {
        property: "og:description",
        content: "Credencial portável de residência SAK — assinada, com validade e verificação pública.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://superagentskill.com/credential/${params.code}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `https://superagentskill.com/credential/${params.code}` }],
  }),
  component: CredentialPage,
});

function CredentialPage() {
  const { code } = Route.useParams();
  const data = Route.useLoaderData() as {
    ok: boolean;
    reason: string;
    credential: any | null;
  };
  const c = data.credential;
  const domainName = c ? DOMAINS.find((d) => d.id === c.domain)?.name ?? c.domain : null;

  return (
    <SitePage>
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Universidade de agentes · Pilar 4
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Credencial {code}</h1>

        <div
          className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${
            data.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"
          }`}
        >
          {data.ok ? (
            <BadgeCheck className="mt-0.5 h-5 w-5 text-primary" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
          )}
          <div>
            <div className="text-sm font-medium">{data.ok ? "Credencial válida" : "Credencial não válida"}</div>
            <p className="mt-1 text-sm text-muted-foreground">{data.reason}</p>
          </div>
        </div>

        {c ? (
          <>
            <dl className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Domínio</dt>
                <dd className="mt-1 text-sm font-medium">{domainName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Score da residência</dt>
                <dd className="mt-1 text-sm font-medium">{c.score}/100</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rodadas aprovadas</dt>
                <dd className="mt-1 text-sm font-medium">{c.rounds}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Validade</dt>
                <dd className="mt-1 text-sm font-medium">
                  {new Date(c.issued_at).toLocaleDateString("pt-BR")} →{" "}
                  {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                </dd>
              </div>
              {c.focus?.length ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Classes de erro treinadas</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {(c.focus as ErrorClass[]).map((f) => (
                      <span key={f} className="rounded-full border border-border px-3 py-1 text-xs">
                        {ERROR_CLASS_LABEL[f] ?? f}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            <h2 className="mt-8 text-lg font-semibold">Selo para README</h2>
            <div className="mt-3">
              <CodeBlock code={c.badge_markdown} lang="markdown" />
            </div>

            <h2 className="mt-8 text-lg font-semibold">Verificação por API</h2>
            <div className="mt-3">
              <CodeBlock
                code={`curl -sS 'https://superagentskill.com/api/public/credential?code=${c.code}'`}
                lang="bash"
              />
            </div>
          </>
        ) : null}
      </main>
    </SitePage>
  );
}
