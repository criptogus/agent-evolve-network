# Expansão da Universidade SAK — Áreas de Expertise Corporativas

## Objetivo
Transformar o exame de admissão e a trilha adaptativa da SAK University em uma fábrica de agentes corporativos, cobrindo as principais funções de negócio, tecnologia e operações. Cada nova área vira um domínio independente com 8 casos de diagnóstico e capacidades específicas no curriculum graph.

## Domínios a adicionar

São 16 novos domínios, organizados em 4 categorias para a UI:

| Categoria | ID | Nome | Foco |
|---|---|---|---|
| **Revenue** | `marketing` | Marketing & Growth | Funnels, segmentação, copy, métricas de growth. |
| | `b2b_sales` | Vendas B2B | Discovery, qualificação, propostas, negociação. |
| | `customer_success` | Customer Success & Retenção | Onboarding, health score, churn, expansão. |
| | `pricing` | Pricing & Monetização | Modelos de preço, elasticidade, pacotes. |
| **Execução** | `strategy` | Estratégia & Planejamento | OKRs, priorização, análise competitiva. |
| | `project_management` | Project Management & Agile | Sprints, dependências, risco, status reports. |
| | `people_ops` | People Ops & RH | Recrutamento, 1:1s, feedback, políticas. |
| | `legal_compliance` | Legal & Compliance | Contratos, LGPD/GDPR, análise de cláusulas. |
| **Operações** | `corporate_finance` | Finanças Corporativas | FP&A, DRE, fluxo de caixa, forecast. |
| | `agentic_crm` | Agentic CRM | Automação de CRM, follow-ups, scoring de leads. |
| | `supply_chain` | Supply Chain & Ops | Estoque, compras, logística, SLAs. |
| | `data_engineering` | Data Engineering & ML Ops | Pipelines, qualidade de dados, observabilidade. |
| **Mídia & Produto** | `social_media` | Social Media & Community | Calendário, resposta a crises, engajamento. |
| | `google_ads` | Google Ads | Campanhas, keywords, orçamento, Quality Score. |
| | `meta_ads` | Meta Ads | Estrutura de campanhas, audiences, criativos. |
| | `linkedin_ads` | LinkedIn Ads | ABM, lead gen, Sales Navigator, B2B targeting. |
| | `digital_product` | Desenvolvimento de Produtos Digitais | Discovery, PRD, roadmap, priorização de features. |
| | `complex_software` | Desenvolvimento de Software Complexo | Arquitetura, escalabilidade, resiliência, segurança. |
| | `tools_mcp` | Mestre em Tools & MCPs | Escolha, orquestração, auth e rate limits de ferramentas. |
| | `cybersecurity` | Cybersecurity & AppSec | Threat modeling, resposta a incidentes, hardening. |

Total após a expansão: **21 domínios** (5 atuais + 16 novos) × 8 casos = **168 casos de diagnóstico**.

## 1. Case bank — 128 novos casos

- 8 casos por novo domínio.
- Distribuição obrigatória por classe de erro: cada domínio terá pelo menos 1 caso de cada uma das 7 classes de erro (`ambiguity_abandon`, `hallucination`, `format_break`, `task_abandon`, `policy_violation`, `tool_misuse`, `instruction_drift`).
- Prompts em português, expectativas determinísticas (marcadores, JSON, recusa, pergunta, limites de tamanho).
- Parte dos casos continua em holdout para evitar overfitting.

Exemplos de casos por domínio:
- `google_ads`: recusa em otimizar sem acesso à conta; JSON de estrutura de campanha; pergunta sobre orçamento antes de escalar.
- `agentic_crm`: confirmação antes de atualizar 10.000 registros; recusa em expor dados de leads; formato de follow-up com campos obrigatórios.
- `complex_software`: pergunta sobre requisitos não-funcionais antes de arquitetar; recusa em expor segredos; JSON de decisão de trade-off.

## 2. Curriculum graph — capacidades específicas por domínio

Adicionar ~30 novos nodes ao `CURRICULUM`, um por domínio novo + nodes transversais:

- `marketing-funnel-analyst` (fixa `hallucination` em métricas)
- `b2b-discovery-call-script` (fixa `ambiguity_abandon`)
- `customer-success-health-score` (fixa `format_break`)
- `pricing-sensitivity-model` (fixa `hallucination`)
- `okr-prioritizer` (fixa `task_abandon`)
- `agile-dependency-mapper` (fixa `ambiguity_abandon`)
- `people-ops-interview-rubric` (fixa `policy_violation`)
- `legal-clause-risk-scanner` (fixa `policy_violation`)
- `corporate-finance-forecast-gate` (fixa `hallucination`)
- `agentic-crm-follow-up-author` (fixa `task_abandon`)
- `supply-chain-sla-guardian` (fixa `instruction_drift`)
- `data-pipeline-observability` (fixa `tool_misuse`)
- `social-media-crisis-responder` (fixa `policy_violation`)
- `google-ads-structure-auditor` (fixa `format_break`)
- `meta-ads-audience-strategist` (fixa `ambiguity_abandon`)
- `linkedin-ads-abm-targeter` (fixa `format_break`)
- `product-discovery-prd-writer` (fixa `task_abandon`)
- `software-architecture-trade-off` (fixa `ambiguity_abandon`)
- `mcp-tool-selector` (fixa `tool_misuse`)
- `appsec-threat-modeler` (fixa `policy_violation`)

Cada node terá `domains` apontando para o(s) domínio(s) correspondente(s), `requires`/`conflicts_with` realistas e `in_registry` vinculado a skills/agentes existentes ou futuros no marketplace.

## 3. Tipos e backend

Arquivos alterados:
- `src/lib/university/types.ts`: expandir `DomainId` e `DOMAINS`; adicionar `DomainCategory` para agrupamento.
- `src/lib/university/cases.ts`: adicionar os 128 novos casos em arrays por domínio; atualizar `ALL_CASES` e `casesForDomain`.
- `src/lib/university/curriculum.ts`: adicionar os ~30 nodes ao `CURRICULUM`; incrementar `CURRICULUM_VERSION`.
- `src/lib/university/diagnose.ts`: nenhuma mudança estrutural — o motor já é genérico.
- `src/lib/university/university.server.ts`: nenhuma mudança estrutural — `domain` continua sendo `text` no banco.
- `src/lib/mcp/tools/university.ts`: nenhuma mudança estrutural — as ferramentas já aceitam qualquer `DomainId`.
- `src/routes/api/public/diagnose/*` e `src/routes/api/public/curriculum/next.ts`: nenhuma mudança estrutural.

Não há mudança de schema do Supabase. A coluna `agent_diagnoses.domain` já é `text` e comporta os novos valores.

## 4. UI/UX — escalar a seleção de domínios

Atualizar `src/routes/diagnose.tsx` e `src/routes/curriculum.tsx`:

- Substituir a grade simples de domínios por uma interface com:
  - Tabs ou select de categoria (Revenue, Execução, Operações, Mídia & Produto).
  - Busca por nome de domínio.
  - Cards com ícone, nome, blurb e contagem de casos.
  - Destaque para domínios com capacidades no marketplace (`in_registry` > 0).
- Manter o fluxo de 3 passos (escolher domínio → gerar exame → colar transcript).
- Na página `/curriculum`, permitir filtrar a trilha por categoria e domínio.

## 5. Testes

- Expandir `tests/university.test.mjs` para cobrir:
  - Todos os novos domínios têm exatamente 8 casos.
  - Cada domínio cobre as 7 classes de erro.
  - `planCurriculum` retorna nodes específicos para cada novo domínio.
  - `casesForDomain` funciona para todos os IDs novos.
- Rodar `bun test tests/university.test.mjs` e `tsgo` antes de finalizar.

## 6. Métricas e versionamento

- Incrementar `CASE_BANK_VERSION` para `"2.0.0"` e `CURRICULUM_VERSION` para `"2.0.0"`.
- Atualizar a landing page `src/components/site/home/University.tsx` para refletir "21 domínios corporativos" e "168 casos de admissão".
- Adicionar entrada no `CHANGELOG.md` ou documento de versão da plataforma.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| 128 novos casos aumentam muito o volume de texto no bundle | Casos são strings puras; o impacto é pequeno (~30-50 KB). Se necessário, split por domínio com lazy load. |
| Curriculum graph fica denso e difícil de manter | Nodes são declarativos; testes cobrem conflitos e prerequisitos cíclicos. |
| UI de seleção fica poluída com 21 domínios | Agrupamento por categoria + busca resolve a escala. |

## Critérios de aceitação

1. `bun test tests/university.test.mjs` passa com os novos casos.
2. Typecheck (`tsgo`) limpo.
3. `/diagnose` exibe 21 domínios agrupados em categorias e permite iniciar exame em qualquer um.
4. `/curriculum` filtra trilhas pelos novos domínios e recomenda capacidades específicas.
5. MCP `diagnose_start` aceita todos os novos `domain` values.
6. Nenhuma migration de banco é necessária nem executada.
