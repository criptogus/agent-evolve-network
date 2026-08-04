# SAK Agent-First: os 3 itens dos 30 dias

Três entregas em sequência, mais um painel de KPIs agent-first. Cada uma fecha uma lacuna verificada no código/banco hoje.

## Estado atual verificado

- `/agents.md` retorna **404**. Causa confirmada: o arquivo é `src/routes/agents.md.ts`, e no TanStack o ponto no nome vira barra — a rota publicada é `/agents/md` (`src/routes/agents.md.ts:109`), enquanto o `llms.txt` promete `/agents.md` (`src/routes/llms[.]txt.ts:13,71`). `curl` local: `/agents.md` = 404, `/agents/md` = 200.
- O manual atual tem ~4KB e descreve só 4 tools e 4 primitivas. O servidor MCP já expõe **33 tools** (incluindo Universidade, Agent Store, residency e credentials) — o manual está desatualizado, não só quebrado.
- Examples: de **636** versões de pacote no banco, **428 (67%)** não têm nenhum exemplo, e **498 (78%)** não têm `compatibility` preenchido. Não existe nenhum campo de "nutrition label" (`when_to_use`, `when_not_to_use`, custo, orçamento de tokens) em `packages`/`package_versions`.
- Tradução por runtime: existe export **Anthropic/Claude** (`src/lib/skills/anthropic-spec.ts`, `src/routes/api/skills.$slug.export.ts`). **Não existe** formato Hermes nem OpenClaw. O padrão de empacotamento em zip já está pronto e duplicado em dois lugares (`src/lib/agents/bundle.ts` + as duas rotas de download).
- Não existe test-drive/sandbox: tudo que se chama `dry_run` hoje é só validação de escrita, não execução do skill.

## Entrega 1 — `agents.md` real (primeiro)

1. Renomear a rota para `src/routes/agents[.]md.ts` com `createFileRoute("/agents.md")`, e manter `/agents/md` respondendo com redirect 301 para não quebrar quem já leu o link.
2. Reescrever o manual (alvo <15KB) com onboarding em 3 estágios:
   - **Conhecer** — o que a plataforma é, as primitivas, as 33 tools em tabela, quando usar cada uma.
   - **Conectar** — endpoint, headers, handshake, erros e o que fazer em cada código.
   - **Evoluir** — review_skill, upload, diagnóstico, currículo, residency, credencial.
3. Checklist executável e **verificável**: cada passo tem uma chamada concreta e um `step_id`.
4. Adicionar `/agents.md` ao `llms.txt`, `sitemap` e ao card em `docs.mcp`.
5. Rodar o próprio `review_skill` sobre o manual e iterar até nota A.

### Checklist verificável (endpoint)

Novo `POST /api/public/onboarding` com `{ session, step_id, evidence }`: valida a evidência do passo (ex.: o agente listou pacotes, avaliou um skill, publicou), grava o progresso e devolve o próximo passo pendente. Uma tabela nova `agent_onboarding_steps` (com RLS e grants) guarda sessão anônima por hash + passo + timestamp, o que dá o funil de onde o agente para.

## Entrega 2 — Examples executáveis + nutrition label

1. Schema de exemplo executável: `{ title, input, expected_output, assertions[] }`, com validador em `src/lib/skills/examples-spec.ts` (formato, tamanho, exemplo negativo obrigatório).
2. Nutrition label por versão: `when_to_use`, `when_not_to_use`, `cost_hint`, `token_budget`, `runtimes[]` — migração nova em `package_versions` com defaults seguros, expostos em `get_package` e na página do pacote.
3. Gate de publicação: publicar exige ao menos 1 exemplo positivo + 1 negativo e o label preenchido; pacotes existentes entram em modo "incompleto" com aviso na UI em vez de bloquear retroativamente.
4. Test-drive: `POST /api/public/test-drive` roda o skill contra os exemplos declarados e devolve pass/fail por assertion — o agente experimenta antes de instalar. Sem persistência de conteúdo do caller.
5. Backfill assistido: tool MCP e ação no Forge que propõe exemplos a partir do `system_prompt` para o autor aprovar.
6. Re-scoring dos pacotes tocados, com o histórico já existente em `skill_review_runs`.

## Entrega 3 — Tradução universal por runtime

1. Extrair um `src/lib/skills/targets/` com um alvo por runtime: `claude` (reaproveita o `anthropic-spec` atual), `hermes` (SKILL.md + manifest), `openclaw` (plugin), `generic` (markdown puro).
2. Unificar o empacotamento zip hoje duplicado num único helper compartilhado.
3. `GET /api/skills/$slug/export?target=claude|hermes|openclaw|generic` e botões de download por runtime na página do pacote.
4. Tool MCP `export_package` com o mesmo seletor de alvo, para o agente instalar sozinho no seu formato.
5. Testes de round-trip por alvo (`tests/export-targets.test.mjs`): cada formato precisa validar contra seu próprio spec.

## Painel de KPIs agent-first

Rota `/admin/agent-kpis` (admin) medindo **só** métricas de agente, sem pageviews: installs via MCP, execuções reportadas, tool calls por tool, conclusão do onboarding por estágio, re-certificações e diplomas emitidos. Usa `package_installs`, `skill_executions`, `mcp_call_log`, `mcp_funnel_events`, `agent_credentials` e a nova tabela de onboarding, via funções SQL agregadas com filtro de bot já existente.

## Notas técnicas

- Rotas públicas ficam sob `src/routes/api/public/*` (fora do gate) com validação Zod e sem PII no retorno.
- Toda tabela nova sai na mesma migração com `GRANT` + RLS + policies escopadas.
- O manual e o checklist são servidos como markdown estático a partir do código, sem chamada de banco, para não sofrer timeout de Worker.
- Ordem de execução: Entrega 1 → painel de KPIs (barato, mede o resto) → Entrega 2 → Entrega 3.
