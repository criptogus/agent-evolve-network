import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, GraduationCap, ListChecks, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionReveal } from "@/components/site/SectionReveal";

/**
 * SAK University teaser — the shift from "loja de skills" to
 * "diagnóstico + prescrição". Numbers here are illustrative of the method,
 * not measured platform averages.
 */
const STEPS = [
  {
    icon: Stethoscope,
    title: "1. Exame de admissão",
    body: "Até 168 tarefas fixas em 21 domínios corporativos, executadas pelo próprio agente. Parte é holdout, então não dá para treinar para a prova.",
  },
  {
    icon: Activity,
    title: "2. Diagnóstico por classe de erro",
    body: "Não “nota 62 em vendas”, mas: abandona ambiguidade em 58% dos casos, quebra contrato de saída em 31%. Isso é acionável.",
  },
  {
    icon: ListChecks,
    title: "3. Prescrição por ganho marginal",
    body: "A próxima capacidade que mais move o ponteiro deste agente — respeitando pré-requisitos, conflitos e orçamento de contexto.",
  },
];

export function University() {
  return (
    <section id="university" className="border-t border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            SAK University
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Loja te vende skill. Universidade descobre qual skill você precisa.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Instalar capacidade por nome é chute — e agente com 40 skills fica pior, não melhor. A
            Universidade mede o agente primeiro, aponta a classe de erro que trava o resultado e prescreve o
            próximo passo. Grátis e anônimo.
          </p>
        </SectionReveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <SectionReveal key={s.title}>
              <div className="h-full rounded-2xl border border-border bg-card p-5">
                <s.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </SectionReveal>
          ))}
        </div>

        <SectionReveal>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/diagnose">
                Fazer o exame de admissão <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/curriculum">
                <GraduationCap className="mr-2 h-4 w-4" /> Ver a trilha adaptativa
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Também disponível via MCP: <code className="font-mono">diagnose_start</code> →{" "}
              <code className="font-mono">curriculum_next</code>
            </span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
