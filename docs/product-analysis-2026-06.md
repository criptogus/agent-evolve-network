# Análise de Produto — Super Agent Skill (junho/2026)

Análise do repositório, da landing page e do posicionamento, com propostas de copy e
roadmap de features de diferenciação. Código referenciado por caminho de arquivo.

---

## 1. Diagnóstico geral

**O produto é mais forte do que a landing page comunica.** A base técnica tem
diferenciais reais e raros no mercado:

- **Trust Score com fórmula pública e auditável** (`src/lib/trust/score.ts`) —
  pesos explícitos: robustez adversarial (45% combinado), sucesso real (20%),
  releases assinadas (10%), idade/ownership/contributors (15%), schema (10%).
- **Pipeline de 3 estágios** Author → Evaluate → Auto-Learn
  (`src/lib/skills/pipelines.server.ts`, 1.210 LOC) — nenhum registry concorrente
  tem loop de melhoria contínua automatizado.
- **Segurança em camadas no CI**: `validate:content` → `audit:skills` (gate
  bloqueante) → SkillSpector/NVIDIA (advisory, SARIF).
- **MCP-native de verdade**: OAuth RFC 9728 + PKCE + bridge stdio, 12 tools,
  leitura anônima sem fricção.
- **Creator economics competitivo**: 80–85% de revenue share.

**O problema central não é o produto — é que o site conta quatro histórias ao
mesmo tempo e nenhuma delas chega inteira ao visitante.**

---

## 2. Landing page (`src/routes/index.tsx`, 1.929 linhas)

### 2.1 Problemas identificados

**P1 — Quatro narrativas concorrendo pelo mesmo visitante:**

| Narrativa | Onde aparece |
|---|---|
| "The university for AI agents. Matrix-style." | `<title>`, OG tags, README |
| "Turn Claude or Cursor into a [expert] in 30 seconds" | H1 do Hero |
| "Other registries hand you prompts. We hand you proof." | Seção `WhatIsThis` |
| "The genius behind the geniuses" (auto-evolução) | `SkillForgeSection` + `EvalLoopSection` |

O visitante sai sem saber se isso é (a) uma loja de prompts, (b) uma plataforma de
compliance para IA, (c) um motor de auto-evolução, ou (d) tudo isso. O title tag
("university… Matrix-style") nem aparece no corpo da página.

**P2 — 13 seções, com pelo menos 4 redundantes:**

```
Hero → HowItWorks → Logos → WhatIsThis → PlainEnglish → CompareIndustries
→ WhoItsFor → SkillForgeSection → EvalLoopSection → CoreConcepts
→ FreeVsPremium → FAQ → CTASection
```

- `PlainEnglish` e `CompareIndustries` fazem a mesma coisa (demo interativa por
  indústria) — duas seções gigantes, com tabs, favoritos em localStorage e editor
  inline, uma atrás da outra.
- `SkillForgeSection` e `EvalLoopSection` contam a mesma história (loop de
  evolução) duas vezes.
- `CoreConcepts` (que explica o que são skills/playbooks/souls/guardrails) só
  aparece na **posição 10** — depois de os quatro termos já terem sido usados
  dezenas de vezes sem definição.

**P3 — Números inconsistentes (mata a credibilidade de um produto que vende "proof"):**

| Número | Onde |
|---|---|
| "459+ expert skills" | Hero badge, H1 sub, CTA "Browse 459 free skills" |
| "500+ community skills…" | `FreeVsPremium`, README |
| "4,000+ packages" | `SkillForgeSection` ("Recommendation engine across 4,000+ packages") |
| "69+ Souls" (hero metrics) vs "50+" (README) vs 6 no repo | Hero / README / `content/souls/` |

**P4 — Métricas fabricadas em um produto cujo pitch é verificabilidade.**
"+12% close rate observed across 1,284 agents", "0 advice violations across 12k
chats", "Tone fidelity 0.91"… O próprio código admite
(`index.tsx:1830` — "Illustrative scenarios — NOT real customer testimonials").
Um security lead — a persona-alvo declarada — reconhece números inventados em
segundos. Isso corrói exatamente a confiança que o Trust Score tenta construir.

**P5 — Pricing contraditório dentro da mesma página.**
O FAQ JSON-LD diz "Hacker is free forever. Agent Pass is $19" (`index.tsx:86`);
a seção `FreeVsPremium` fala "Pro & Enterprise". E o CTA de Enterprise em
`pricing.tsx:60` aponta para `contact@zeroagency.ai` — domínio de terceiro.

**P6 — Jargão antes da definição.** SkillForge, Evolution Engine (dois nomes
para a mesma coisa?), Trust Score, adversarial harness, A2A learning, hot-swap,
souls — tudo usado antes de qualquer explicação.

**P7 — CTAs dispersos.** A página manda o visitante para `/marketplace`,
`/connect`, `/generate`, `/skillforge`, `/onboarding`, `/evaluation`,
`/pricing`, `/use-cases` e `/bounties`. Não há um funil; há um labirinto.

### 2.2 Proposta: uma história, sete seções

**Escolher UMA narrativa-mestra e subordinar as outras.** Recomendação: manter o
H1 atual (resultado em 30s) como gancho e usar "proof" como diferenciador — é a
única claim que nenhum concorrente (PromptHub, agente marketplaces, awesome-lists)
consegue copiar rápido. "University/Matrix" vira tagline de marca (README, OG),
não promessa central.

```
1. Hero          — resultado + ação única (copiar URL MCP)
2. How it works  — 3 passos (não 4)
3. Proof         — o diferencial: assinatura, adversarial, Trust Score
4. Demo          — UMA seção interativa por indústria (fundir PlainEnglish + CompareIndustries)
5. The stack     — os 4 primitivos (CoreConcepts, movida para cima)
6. Pricing       — nomes consistentes: Hacker / Agent Pass / Enterprise
7. FAQ + CTA     — fechamento com a mesma ação do Hero
```

Cortar: `Logos` (fundir no Hero como linha de texto), `WhoItsFor` (mover para
`/use-cases`), `SkillForgeSection` + `EvalLoopSection` (fundir em um bloco de 4
bullets dentro de "Proof" — a auto-evolução é evidência da prova, não uma
segunda história), `CompareIndustries` (fundir na demo única).

### 2.3 Copy proposto (em inglês, pronto para usar)

**Hero:**

> **Eyebrow:** `459 signed skills · Works with Claude, Cursor & ChatGPT`
> *(número vindo de uma fonte única — ver §4.2)*
>
> **H1:** `Your AI agent, expert in anything. In 30 seconds.`
> *(alternativa mantendo o typewriter atual: `Turn Claude or Cursor into a {cybersec expert / senior SRE / …}` — funciona, manter se preferir)*
>
> **Sub:** `Paste one link. Your agent gains 459 expert skills — every one
> signed, tested against jailbreaks, and scored in public. No code. No
> fine-tuning. Free to start.`
>
> **CTA primário:** caixa de copiar URL MCP (manter — é o melhor elemento da página)
> **CTA secundário:** `Browse the skills →`
> **Linha de confiança:** `Free forever · No signup to browse · Open source (Apache 2.0)`

**Seção Proof (substitui WhatIsThis + SkillForge + EvalLoop):**

> **H2:** `Anyone can publish a prompt. We publish proof.`
>
> 4 cards:
> 1. **Attacked before it ships** — `Every skill runs an adversarial gauntlet:
>    prompt injection, jailbreaks, data exfiltration, policy bypass. Pass rate
>    is public, per attack class.`
> 2. **Signed, not just published** — `Releases are Ed25519-signed and
>    verifiable offline. Your security team can check the math without
>    trusting us.`
> 3. **A score you can audit** — `Trust Score is a public formula — adversarial
>    robustness, real-world success, signed releases. Embed the live badge in
>    your README.`
> 4. **Gets better while you sleep** — `SkillForge re-tests every skill daily
>    and ships patched versions automatically. Underperformers get re-scored,
>    not buried.`

**Regras de copy:**
- **Substituir todas as métricas fabricadas** por (a) números reais do registry
  (installs, pass rate adversarial, nº de releases assinadas — tudo já existe no
  banco) ou (b) frases de capacidade sem número ("blocks competitor mentions
  before they ship"). Nunca inventar percentuais de negócio.
- **Um número canônico de skills** em toda a página (ver §4.2).
- **"Evolution Engine" morre; só "SkillForge"** — um nome por conceito.
- Title tag alinhado ao H1: `Super Agent Skill — Expert skills for AI agents,
  signed and tested` (manter "The university for AI agents" como tagline de
  marca no README/OG se quiserem).

### 2.4 Navegação (`src/components/site/Nav.tsx`)

- Dropdown **Create tem 7 itens** com 4 ferramentas de criação (Upload,
  Generate, SkillForge, Forge) — reduzir para 2 entradas: `Create a skill`
  (→ wizard unificado que decide entre upload/generate) e `My SkillForge`
  (dashboard, logado).
- **Discover aparece em dois menus** (Browse e Create) — remover do Create.
- `Evaluation` e `Match` não são "Create" — mover Match para Browse, Evaluation
  para Docs/ferramenta dentro do fluxo de publicação.
- Renomear: **Forge → "Skill Studio"** (editor) e manter **SkillForge** só como
  o motor/dashboard — hoje os dois nomes confundem até a navegação.

---

## 3. Funil e rotas (consolidação)

| Hoje | Problema | Proposta |
|---|---|---|
| `/marketplace/leaderboard` + `/marketplace/rankings` + `/discover` | 3 formas de browsing; leaderboard é um subset de rankings | `/discover` absorve leaderboard (tab "Top installs"); `/marketplace/leaderboard` → redirect |
| `/forge` vs `/skillforge` | Nomes quase iguais, funções diferentes (editor vs dashboard) | Renomear `/forge` → `/studio`; redirects mantidos |
| `/generate` (2.148 LOC) vs `/skillforge` (guided builder) vs `/upload` | 3 entradas de criação | Wizard único com 3 modos; rotas antigas redirecionam |
| `/onboarding` vs `/connect` vs `/connect/$client` | Dois fluxos de conexão | `/connect` como canônico; `/onboarding` → redirect |
| Pricing: FAQ vs FreeVsPremium vs `pricing.tsx` | 2 nomenclaturas de planos | Hacker / Agent Pass / Enterprise em todo lugar |
| `pricing.tsx:60` `contact@zeroagency.ai` | Domínio de terceiro no CTA Enterprise | Trocar para `enterprise@superagentskill.com` (ou form) |

---

## 4. Melhorias técnicas no repositório

### 4.1 Refatoração de arquivos gigantes
- `src/routes/generate.tsx` (2.148 LOC) e `src/routes/index.tsx` (1.929 LOC):
  extrair cada seção para `src/components/site/home/*` e
  `src/components/generate/*`. Hoje qualquer ajuste de copy exige navegar um
  arquivo de 2 mil linhas.

### 4.2 Fonte única de verdade para estatísticas do site
Criar `src/lib/site-stats.ts` (ou server function que conta do registry) e usar
em Hero, FreeVsPremium, README badge e OG description. É a causa-raiz do drift
459/500/4.000. Idealmente os números vêm **ao vivo** do banco — o que também é
marketing ("contagem ao vivo" reforça o pitch de registry vivo).

### 4.3 Testes
- Boa cobertura de domínio (16 suites: trust, adversarial, bounties, CLI,
  signing), mas **zero testes unitários de UI** — só um e2e Puppeteer
  (`responsive-discover.test.mjs`). Adicionar Vitest + Testing Library para os
  componentes de marketplace/forge (os que carregam lógica de negócio).
- Adicionar um teste que valide consistência de copy (ex.: o número de skills
  citado vem de `site-stats` e não de literais).

### 4.4 Pagamentos
- Stripe (`stripe@22`) e Paddle (`@paddle/paddle-node-sdk`) coexistem. Definir o
  primário e remover ou isolar o legado — duas integrações de billing ativas é
  superfície de bug e de compliance.

### 4.5 Higiene
- `Nav.tsx:172-173`: `DropdownMenuSeparator` duplicado.
- JSON-LD FAQ (`index.tsx:53-90`) responde pricing com nomes de planos que
  precisam bater com `pricing.tsx` após a unificação.

---

## 5. Features novas para diferenciação

Ordenadas por (impacto na proposta única ÷ esforço). As três primeiras
transformam o maior ativo do produto — a infraestrutura de verificação — em
moat distribuído.

### 5.1 Trust Badge & Certification API ("adversarial as a service") — alto impacto
A infra de auditoria já existe (`audit:skills`, SkillSpector, harness
adversarial, badge SVG em `api/badges.trust.$slug.svg.ts`). Abrir como serviço:
qualquer autor de skill **fora** do registry submete seu YAML e recebe um Trust
Score assinado + badge embeddable. Vira o "SSL/SOC 2 das skills de agente":
mesmo quem não hospeda no marketplace carrega o selo — e cada badge é um
backlink + funil de aquisição. Nenhum concorrente tem o harness para copiar isso.

### 5.2 Stacks compartilháveis ("docker-compose para agentes") — alto impacto, viral
Um arquivo/URL que descreve um conjunto: skills + playbook + soul + guardrails
(`stack.yaml`). Um link instala tudo via MCP: `superagentskill.com/s/fintech-support-br`.
Times compartilham stacks internos; criadores publicam stacks curados (e ganham
revenue share composto). É o loop viral que falta: hoje compartilhar = mandar
alguém procurar 5 pacotes; com stacks = um link. A base já existe em `/packs`,
mas packs são curados pela casa — abrir para a comunidade.

### 5.3 AgentBOM — atestado de auditoria exportável — diferencial enterprise
Já existem attestation scripts (`trust:attest`, `trust:verify`). Empacotar como
feature: um comando/endpoint gera o **Bill of Materials do agente** — todas as
skills instaladas, versões, assinaturas, Trust Scores, pass rates adversariais —
em PDF/JSON assinado, pronto para anexar em auditoria SOC 2 / HIPAA / PCI.
Justifica o tier Enterprise sozinho e é coerente com a persona "quem assina o
risco do LLM".

### 5.4 Playground por pacote ("test drive") — médio impacto, baixo esforço
`/play` já existe. Embedar uma versão mínima na página de cada pacote
(`marketplace.$packageId.tsx`): "experimente esta skill agora, sem instalar".
Reduz a maior fricção de conversão (instalar para descobrir se presta) e gera
telemetria de qualidade real para o Trust Score.

### 5.5 Bounties integrados ao GitHub — médio impacto
Bounty criado → issue espelhada no repo; PR aceito → payout automático. Remove
fricção do lado do criador e traz o público dev de onde ele já está. A lógica
de elegibilidade já existe (`src/lib/growth/bounties.ts`).

### 5.6 Drift alerts / observabilidade de skill — aposta de retenção
O loop Observe→Assess→Verify já roda (EvalLoop). Expor como alerta acionável:
"sua skill `kyc-analyst@2.0` caiu 3pp no pass rate adversarial esta semana —
patch disponível". Via e-mail/Slack/webhook. Transforma o dashboard passivo do
SkillForge em motivo de retorno semanal (retenção do Agent Pass de $19/mês).

### O que **não** fazer
- Não adicionar mais um tipo de primitivo (já são 4 + packs + stacks propostos).
- Não construir um chat/agente próprio — o posicionamento "funciona com o agente
  que você já usa" é parte do moat.

---

## 6. Sequência recomendada

| Prioridade | Item | Esforço |
|---|---|---|
| P0 | Corrigir números inconsistentes + métricas fabricadas + e-mail zeroagency (§2.3, §4.2) | Horas |
| P0 | Unificar nomes de planos e o par Forge/SkillForge | Horas |
| P1 | Reestruturar landing para 7 seções com narrativa única (§2.2) | Dias |
| P1 | Simplificar Nav (Create com 2 itens) e consolidar rotas de browsing (§3) | Dias |
| P2 | Playground por pacote (§5.4) + stacks compartilháveis (§5.2) | Semanas |
| P2 | Trust Badge API externa (§5.1) + AgentBOM (§5.3) | Semanas |
| P3 | Bounties↔GitHub (§5.5), drift alerts (§5.6), testes de UI (§4.3) | Contínuo |
