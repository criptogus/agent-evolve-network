import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  BookOpen,
  Sparkles,
  Beaker,
  Gauge,
  ShieldCheck,
  Wand2,
  Trophy,
  CheckCircle2,
  Loader2,
  Brain,
  GitBranch,
  Target,
} from "lucide-react";

export type ForgeStage = {
  key: string;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  /** rough seconds budget for the simulated stage */
  weight?: number;
};

export const AUTHOR_STAGES: ForgeStage[] = [
  { key: "intake",   title: "Lendo o brief",                    detail: "Extraindo objetivos, restrições e critérios de sucesso", icon: BookOpen, weight: 2 },
  { key: "research", title: "Pesquisando referências de mercado", detail: "Cruzando playbooks vencedores, papers e SOTA do vertical", icon: Search, weight: 4 },
  { key: "method",   title: "Aplicando método SkillForge",       detail: "Estruturando system prompt, regras, exemplos e guardrails", icon: Sparkles, weight: 4 },
  { key: "draft",    title: "Compondo o pacote v0.1.0",          detail: "Gerando rascunho executável (skill / playbook / soul)",   icon: Wand2, weight: 3 },
  { key: "self_eval",title: "Auto-avaliação interna",            detail: "Rodando casos canônicos e adversariais",                  icon: Beaker, weight: 3 },
  { key: "polish",   title: "Refinando até nota 9+/10",          detail: "Iterando precisão, anti-alucinação e segurança",          icon: Trophy, weight: 4 },
  { key: "ship",     title: "Empacotando para publicação",       detail: "Versionando, gerando relatório e artefatos",              icon: CheckCircle2, weight: 1 },
];

export const EVAL_STAGES: ForgeStage[] = [
  { key: "load",     title: "Carregando o pacote",                detail: "Versão atual, regras, exemplos e histórico", icon: BookOpen, weight: 1 },
  { key: "cases",    title: "Gerando casos de teste",             detail: "Canônicos + adversariais + edge cases",      icon: GitBranch, weight: 3 },
  { key: "run",      title: "Executando avaliações",              detail: "Multi-modelo, multi-cenário, com judges independentes", icon: Brain, weight: 5 },
  { key: "score",    title: "Pontuando dimensões",                detail: "Precisão · saúde · alucinação · segurança", icon: Gauge, weight: 3 },
  { key: "safety",   title: "Auditoria de segurança",             detail: "Verificando guardrails e modos de falha",   icon: ShieldCheck, weight: 2 },
  { key: "verdict",  title: "Consolidando veredicto",             detail: "Forças, fraquezas e ações de melhoria",     icon: Target, weight: 2 },
];

export const EVOLVE_STAGES: ForgeStage[] = [
  { key: "metrics",  title: "Lendo métricas e learnings",         detail: "Telemetria, falhas recorrentes, feedback do mercado", icon: Gauge, weight: 2 },
  { key: "diag",     title: "Diagnóstico do skill",               detail: "Identificando gaps que mais afetam a nota",            icon: Search, weight: 3 },
  { key: "research", title: "Buscando padrões campeões",          detail: "Comparando com top-performers do vertical",            icon: Trophy, weight: 3 },
  { key: "patch",    title: "Desenhando o menor patch eficaz",    detail: "Reescrevendo prompt, regras e adicionando exemplos",   icon: Wand2, weight: 4 },
  { key: "verify",   title: "Verificando ganho",                  detail: "Re-avaliando para garantir lift real (sem regressão)", icon: Beaker, weight: 3 },
  { key: "ship",     title: "Promovendo para beta",               detail: "Versão incremental + changelog auditável",             icon: CheckCircle2, weight: 1 },
];

type Props = {
  active: boolean;
  done: boolean;
  stages: ForgeStage[];
  title?: string;
  finalScore?: number | null;
  verdict?: string | null;
};

export function ForgeProgress({ active, done, stages, title = "Trabalho em execução", finalScore, verdict }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  const totalWeight = useMemo(() => stages.reduce((s, x) => s + (x.weight ?? 2), 0), [stages]);

  useEffect(() => {
    if (!active) {
      startedAt.current = null;
      setElapsed(0);
      return;
    }
    startedAt.current = Date.now();
    const id = setInterval(() => {
      if (startedAt.current) setElapsed((Date.now() - startedAt.current) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, [active]);

  // Map elapsed seconds onto stages — last stage stays "in progress" until `done`.
  const { currentIndex, stageProgress, overall } = useMemo(() => {
    if (done) return { currentIndex: stages.length, stageProgress: 1, overall: 1 };
    let acc = 0;
    let idx = 0;
    let sp = 0;
    for (let i = 0; i < stages.length; i++) {
      const w = stages[i].weight ?? 2;
      if (elapsed < acc + w) {
        idx = i;
        sp = (elapsed - acc) / w;
        break;
      }
      acc += w;
      idx = i;
      sp = 1;
    }
    // Hold on the last stage if the operation is still running past the budget.
    if (elapsed >= totalWeight) {
      idx = stages.length - 1;
      sp = 0.92;
    }
    const ov = Math.min(0.98, elapsed / totalWeight);
    return { currentIndex: idx, stageProgress: sp, overall: ov };
  }, [elapsed, stages, totalWeight, done]);

  if (!active && !done) return null;

  return (
    <Card className="mt-4 border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {done ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {done ? "Trabalho concluído" : title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {typeof finalScore === "number" && (
              <Badge variant="default" className="text-sm">
                Nota {finalScore.toFixed(1)}/10
              </Badge>
            )}
            {verdict && (
              <Badge variant={verdict === "ship" ? "default" : verdict === "iterate" ? "secondary" : "destructive"}>
                {verdict}
              </Badge>
            )}
            {!done && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {elapsed.toFixed(1)}s
              </span>
            )}
          </div>
        </div>
        <Progress value={Math.round((done ? 1 : overall) * 100)} className="mt-3 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((s, i) => {
          const isDone = done || i < currentIndex;
          const isActive = !done && i === currentIndex;
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={
                "flex items-start gap-3 rounded-md border p-3 transition-colors " +
                (isActive ? "border-primary/60 bg-primary/5" :
                 isDone ? "border-border/60 bg-muted/30" :
                 "border-border/40 opacity-60")
              }
            >
              <div className={
                "mt-0.5 grid h-7 w-7 place-items-center rounded-full " +
                (isDone ? "bg-primary text-primary-foreground" :
                 isActive ? "bg-primary/20 text-primary" :
                 "bg-muted text-muted-foreground")
              }>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> :
                 isActive ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{s.title}</p>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-primary">em andamento</span>
                  )}
                  {isDone && !isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">concluído</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
                {isActive && (
                  <Progress
                    value={Math.round(stageProgress * 100)}
                    className="mt-2 h-1"
                  />
                )}
              </div>
            </div>
          );
        })}
        {done && (
          <p className="pt-2 text-xs text-muted-foreground">
            Pipeline executado pelo método SkillForge — pesquisa, autoria, auto-avaliação, refino até 9+/10 e empacotamento auditável.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
