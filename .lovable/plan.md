# Super Agent Skill — Moats além do PRD v1.0

O PRD já cobre bem o básico (marketplace MCP-first, SkillForge AI, feedback agent-driven, network effects). O que falta é **moat estrutural** que cresça com o tempo e seja **caro de copiar** mesmo para Anthropic, OpenAI ou um clone bem financiado.

A maioria dos pontos abaixo já tem alicerce no código atual (forge, evaluator, evolution, marketplace, MCP server, packs, customization, ranking, anti-fraud, SKILL.md export). A proposta é transformar esses alicerces em **vantagens compostas**.

## A. Reposicionamento estratégico do PRD

1. **De "Hotmart de agentes" para "App Store + GitHub + Datadog dos agentes".**
   Hotmart sugere infoproduto descartável. O que defende margem é a tríade: distribuição (App Store), versionamento aberto (GitHub) e observabilidade contínua (Datadog). O pitch passa a ser: *"o único lugar onde seu agente descobre, instala, versiona e mede skills — automaticamente, via MCP."*

2. **Trocar "skills criados por experts" por "skills que aprendem com cada execução real".**
   Experts humanos é commodity (qualquer marketplace contrata). O moat de verdade é o **dataset de execuções reais** (`evaluator_runs`, `adversarial_results`, feedback agent-driven) que ninguém mais possui. Sales pitch: *"cada skill aqui já foi executada N mil vezes em produção — o seu agente herda essa cicatriz."*

## B. 10 diferenciais competitivos sustentáveis

### 1. Skill Telemetry Network (moat de dados)
Toda execução de skill via MCP retorna telemetria opcional anônima: latência, tokens, sucesso/erro, modelo usado, custo. Vira:
- **"Trust score" público** por skill (precision em produção × benchmark do evaluator).
- **Heatmap de modelos**: "este skill funciona 94% no Sonnet 4.5, 71% no GPT-5-mini" — ninguém mais tem esse dado.
- **Skill Insurance**: skills com >10k execuções e >95% success ganham selo "Battle-tested" e podem custar premium.

Já temos `evaluator_runs` e `adversarial_results` — falta a coleta runtime via MCP `report_execution` tool.

### 2. Compatibility Matrix automática (Anthropic não tem)
Cada skill é re-avaliada semanalmente em **todos os modelos suportados** (Claude Sonnet/Opus/Haiku, GPT-5/mini/nano, Gemini 2.5/3, Grok). Resultado: badge "Works on: ✅ Claude ✅ GPT ⚠️ Gemini" antes da compra. Isso **trava** Anthropic/OpenAI — eles nunca vão validar contra concorrentes.

Aproveita o `evaluatorPipeline` atual + cron semanal.

### 3. Forking + Genealogia de Skills (moat tipo GitHub)
Cada skill tem árvore: `parent_id`, `forked_from`, diff visual entre versões. Usuário pode:
- Forkar `cardiologist-soul` → criar `pediatric-cardiologist-soul`.
- Receber royalties automáticos quando alguém usa o fork (via revenue share configurável).
Isso copia o efeito GitHub: **comunidade gera o long-tail**, não os experts contratados.

### 4. Live Skill Composition (Pack Builder agent-driven)
Hoje temos packs estáticos. Próximo passo: agente envia *"sou um agente de growth para SaaS B2B"* e o SkillForge **compõe um pack ao vivo** (soul + 4 skills + 2 playbooks + 3 guardrails) escolhidos por embeddings + telemetria. Pack vira efêmero ou pode ser salvo.

Reutiliza `match.functions.ts` + `packs/pipeline.server.ts`.

### 5. Adversarial Skill Hardening (red team contínuo)
Já temos adversarial no evaluator. Diferencial: rodar **prompt injection / jailbreak / data leakage** automatizado em todo skill antes de publicar, e **publicar o relatório de robustez** (CVE-style: `SAS-2026-0042: skill X vazava CPF em 3% dos casos, corrigido v1.2.0`). Cria confiança que Anthropic Skills nunca terá (eles não publicam falhas).

### 6. Dual Pricing por Outcome (não por seat)
Em vez de só assinatura, oferecer *"pague R$ 0,03 por execução bem-sucedida"* (success-based, validado pelo agente). Skills competem por **ROI mensurável**, não por marketing. Combina com Telemetry Network (#1).

Stripe/Paddle já estão integrados — falta `usage-based meter` + webhook de execução.

### 7. Skill Drift Detection + Auto-PR
Quando a telemetria detecta queda de qualidade (modelo novo lançado, API externa mudou, novo jailbreak surgiu), o SkillForge **abre um Pull Request automático** com patch sugerido. O autor aprova/rejeita — `forge-loop` já faz quase isso, falta a parte "drift detection" e o fluxo PR-style com diff visual.

### 8. Cross-skill Memory Layer (Soul OS)
Souls hoje são prompts de personalidade. Diferencial: soul carrega **memória persistente compartilhada** entre skills do mesmo agente (preferências do usuário, glossário do nicho, estilo). Vira o "iCloud do agente" — sai de uma plataforma com skills + memória, não só prompts.

Requer nova tabela `soul_memory` com RLS por usuário/agente + MCP tool `recall_memory` / `save_memory`.

### 9. Marketplace de Guardrails certificados (moat regulatório)
Guardrails LGPD/HIPAA/GDPR/SOC2 **assinados digitalmente por escritórios de advocacia ou auditores parceiros** (Pinheiro Neto, Mattos Filho, Big4). Empresa que usa skill com guardrail certificado tem **trilha de auditoria** automática. Vira pré-requisito enterprise.

Aproveita `permissions[]` + `guardrails` já no schema. Falta `cert_authority`, `signature`, e fluxo de revisão jurídica.

### 10. Open Protocol + closed gravity well (estratégia tipo Docker Hub)
**Publicar como padrão aberto** o formato Super Agent Skill (já estamos próximo com export SKILL.md compatível Anthropic) — qualquer registry pode hospedar. Mas o **SkillForge AI, a telemetria, o ranking cruzado, a compatibility matrix e os guardrails certificados ficam só aqui**. Mesmo padrão do Docker: imagem é portátil, mas todo mundo usa Docker Hub.

## C. Anti-features (decisões caras de manter)

- **Não** vender skills sem evaluator score público ≥ 7. Volume vs. confiança — escolher confiança.
- **Não** permitir skill sem reprodutibilidade (seed + modelo fixado no version).
- **Não** entrar em "agent platform" (concorrer com Cursor/Claude). Manter foco em camada de skills neutra — é o que destrava parcerias com todos eles.

## D. Roadmap sugerido (ordem por ROI/esforço)

| Fase | Item | Esforço | Moat |
|------|------|---------|------|
| 0 (já feito) | Forge + Evaluator + Evolution + SKILL.md export + Marketplace + MCP | — | base |
| 1 | #1 Telemetry Network (MCP `report_execution` + `trust_score`) | M | dados exclusivos |
| 1 | #5 Adversarial Hardening público (CVE-style page por skill) | S | confiança |
| 2 | #2 Compatibility Matrix multi-modelo (cron semanal) | M | fixa Anthropic/OpenAI |
| 2 | #7 Drift Detection + Auto-PR (encima de `autolearn`) | M | retenção |
| 3 | #3 Forking + Genealogia + Royalties | L | network long-tail |
| 3 | #6 Pricing por outcome (Stripe meter) | M | diferenciação |
| 4 | #8 Soul Memory OS (cross-skill state) | L | lock-in |
| 4 | #4 Live Pack Composition agent-driven | M | UX wow |
| 5 | #9 Guardrails certificados (parcerias jurídicas) | XL | enterprise/regulatório |
| 5 | #10 Open Protocol spec + branding "Powered by Super Agent Skill" | M | gravity well |

## E. Status de implementação

- **Fase 1 — Telemetry Network + Robustness (CVE-style)**: ✅ entregue
  (`skill_executions`, `skill_robustness_findings`, RPC `get_skill_trust`, MCP
  tools `report_execution`/`get_skill_trust`, página pública `/marketplace/trust/$slug`).

- **Fase 2 — Compatibility Matrix + Drift Detection**: ✅ entregue
  - `skill_compatibility` (matriz por skill × modelo) + probe leve
    (`compatibility.server.ts`) que roda os exemplos da skill em vários modelos
    e usa um judge neutro para classificar pass/warn/fail.
  - Server fn admin `runCompatibilitySweep` + leitura pública via trust page
    (`getSkillTrust` agora retorna `compat[]`).
  - `skill_drift_alerts` + RPC `compute_skill_drift` + `detectSkillDrift`
    (admin server fn) que detecta quedas de sucesso (≥5pp warn, ≥15pp critical)
    com volume mínimo e gera **patch sugerido por IA** sobre o `system_prompt`.

Próximo: agendar o sweep (cron) e expor inbox de drift no Forge.
