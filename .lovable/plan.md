# Universidade de Agentes — Fase 1: Diagnóstico + Currículo adaptativo

Muda o modelo mental de "loja de skills" para "trilha": antes de instalar, o agente faz um exame de admissão; depois recebe a próxima capacidade com maior ganho marginal, respeitando pré-requisitos, conflitos e limite de contexto.

Escopo aprovado agora: itens 1 e 2. Diagnóstico com banco de casos fixos por domínio (rápido, sem custo de LLM por run). Itens 3, 4, 5 e 6 ficam no roadmap — a credencial verificável (4) fica preparada porque o diagnóstico já produz o registro assinável.

## 1. Exame de admissão (`skill.diagnose`)

Fluxo em duas chamadas, para que o custo de execução fique no agente e não no nosso servidor:

1. `diagnose_start({ domain, installed_skills?, agent_fp? })` — devolve 30-50 tarefas do domínio (id + prompt + formato de resposta esperado) e um `diagnosis_id`.
2. O agente executa as tarefas no próprio host e envia de volta as respostas.
3. `diagnose_submit({ diagnosis_id, answers })` — pontua cada resposta de forma determinística (marcadores obrigatórios, marcadores proibidos, recusa esperada, aderência de formato) e devolve o transcript.

Relatório devolvido:

- Score por **classe de erro** (não por skill): ambiguidade não resolvida, alucinação factual, quebra de formato, abandono no meio da tarefa, violação de política, uso indevido de ferramenta, deriva de instrução.
- Gargalo principal em linguagem direta: "seu gargalo não é conhecimento de vendas — você desiste em ambiguidade no passo 3 (7 de 9 casos)".
- Custo observado: tokens e latência por tarefa quando o agente reportar.
- Prescrição: 1-3 capacidades que endereçam exatamente as classes de erro que falharam, com o ganho esperado.

Banco de casos versionado no repo (revisável como código), com holdout: parte dos casos nunca é devolvida na íntegra para evitar treinar contra o exame.

## 2. Currículo adaptativo (`curriculum.next()`)

Grafo de dependências entre capacidades, versionado no repo:

- `provides` — quais classes de erro a skill corrige
- `requires` — pré-requisitos
- `conflicts_with` — skills que competem pelo mesmo espaço de instrução
- `context_cost` — peso aproximado em contexto

`curriculum_next({ diagnosis_id | error_profile, installed_skills, budget? })` devolve a próxima capacidade ordenada por **ganho marginal**: cobertura da classe de erro que mais dói, menos o que já está coberto pelo que está instalado, penalizando conflito e custo de contexto. Se o agente já estiver no limite de contexto, a recomendação passa a ser *remover* ou *trocar* uma skill — é a resposta ao context rot (40 skills instaladas pioram o agente).

Saída: trilha ordenada (agora / depois / pré-requisito faltando) com justificativa por item.

## 3. Superfícies

- **MCP**: `diagnose_start`, `diagnose_submit`, `curriculum_next` no servidor existente (leitura anônima; histórico persistido só com conta).
- **JSON simples** (sem SSE, mesmo padrão do `/api/public/review`): `POST /api/public/diagnose/start`, `POST /api/public/diagnose/submit`, `POST /api/public/curriculum/next`.
- **Web**: `/diagnose` — inicia o exame, cola o transcript, vê o relatório de gargalos; `/curriculum` — a trilha visual com o grafo e o que está bloqueado; card do último diagnóstico em `/account`.
- **Landing**: bloco curto "Matrícula = diagnóstico, não download" apontando para `/diagnose`.

## 4. Dados

Novas tabelas (RLS: cada dono vê só o seu; `service_role` completo):

- `agent_diagnoses` — domínio, agent fingerprint, status, score geral, breakdown por classe de erro, prescrição, timestamps.
- `agent_diagnosis_items` — uma linha por tarefa: caso, resposta, aprovado/reprovado, classe de erro, latência e tokens reportados.

Diagnósticos anônimos são permitidos e retornados na resposta, mas só persistem vinculados a um usuário quando há token/OAuth.

## 5. Detalhes técnicos

- Banco de casos: `content/diagnostics/<domain>/*.yaml` + JSON Schema em `content/schemas/diagnostic-case.schema.json`, validado por `scripts/validate-content.mjs`. Reaproveita o padrão de expectativas e o carregador dos casos adversariais (`src/lib/adversarial/loader.ts`, `holdout.ts`).
- Scoring determinístico em `src/lib/university/diagnose.ts` (puro, testável) — sem chamada de LLM no caminho da run.
- Grafo em `content/curriculum/graph.yaml`, carregado e resolvido por `src/lib/university/curriculum.ts` (puro): detecção de ciclo, cobertura marginal, penalidade de conflito e orçamento de contexto.
- Acesso a dados/servidor em `src/lib/university/*.server.ts`; server functions finas em `src/lib/university/university.functions.ts` (só `createServerFn` + imports, conforme a regra de splitting do projeto).
- Ferramentas MCP em `src/lib/mcp/tools/university.ts`, registradas em `src/lib/mcp/http.server.ts`, e citadas no `overview`.
- Testes novos: `tests/diagnose-scoring.test.mjs` (classes de erro, holdout) e `tests/curriculum-graph.test.mjs` (pré-requisito, conflito, ganho marginal, teto de contexto).
- Domínios iniciais do exame: vendas/GTM, engenharia/code review, suporte, financeiro/compliance, dados — cerca de 40 casos por domínio.

## Fora do escopo desta fase

Residência com rubric agent (3), diploma verificável entre agentes (4), benchmark aberto e camada privada (5), peer learning federado (6). O diagnóstico já grava tudo em formato assinável, então (4) vira extensão e não reescrita.
