## PRD — Super Agent Skill (status atual + pendências)

> Substitui `.lovable/plan.md`. Estrutura: visão → módulos → estado por módulo → backlog priorizado.

---

### 1. Visão

Registry + MCP server de **skills, playbooks, souls e guardrails** para agentes. Autores publicam pacotes versionados; consumidores descobrem via marketplace web ou via MCP no Cursor/Claude/Codex/VS Code, com tokens pessoais para escrita.

Loop alvo: **mint token → conectar cliente MCP → testar no navegador → usar no agente → ver métricas/insights**.

---

### 2. Módulos e estado

Legenda: ✅ entregue · 🟡 parcial · ⛔ não iniciado

#### 2.1 Marketplace e descoberta
- ✅ `/marketplace` com filtros por `type` (skill/playbook/soul/guardrail), por `vertical`, busca por texto (nome, slug, autor).
- ✅ Página de detalhe `/marketplace/$packageId` e `/souls/$slug` com download/duplicate.
- ✅ `llms.txt` público.
- 🟡 Ordenação por `install_count` (campo existe na tabela; UI ainda não expõe sort).
- ⛔ `sitemap.xml` dinâmico.
- ⛔ `og:image` por pacote (hoje herda do root e sobrescreve).

#### 2.2 Autoria e versionamento
- ✅ Versionamento de souls com histórico, `package_versions` (system_prompt, rules, examples, compatibility, status) e rollback.
- ✅ Workflow de revisão (`/admin/review`) com `review_status` pending/approved/rejected, publish/pause.
- ✅ Upload UI (`/upload`) e import admin (markdown / GitHub).
- ⛔ Página `/account/submissions` para o autor acompanhar status/notas das próprias submissões.
- ⛔ Badge no Nav quando há mudança de review desde a última visita.
- ⛔ E-mail transacional em approve/reject.

#### 2.3 MCP server e tokens
- ✅ `/api/mcp` (streamable-http) com 5 tools: `list_packages`, `search_registry`, `get_package`, `request_primitive`, `upload_packages`.
- ✅ `/api/public/mcp/health` retornando version + tools.
- ✅ `/account/tokens`: mint, revoke, copy + validate por snippet, guia `Authorization: Bearer`, configs prontas para Cursor/Claude/VS Code.
- ✅ `/connect` com **Test MCP live** cobrindo as 5 tools + `tools/list` + health, com persistência de token em `localStorage`.
- 🟡 Onboarding de cliente MCP: snippets prontos existem, mas falta bloco "one-click copy com token recém-criado embutido" e snippet `mcp-inspector` para debug terminal.

#### 2.4 Métricas e observabilidade
- ✅ Tabela `package_metrics_daily` populada (runs, ok/error/blocked, health, latency, hallucination, precision).
- ✅ `runs` + `run_events` por usuário.
- ⛔ Aba **Insights** em `/souls/$slug` (visível ao autor/admin) com runs/dia, latência, health, hallucination.
- ⛔ Card "últimas 7d" no futuro `/account/submissions`.

#### 2.5 Billing
- ✅ `/pricing` e `/account/billing` com Paddle (sandbox + live), webhook em `/api/public/payments/webhook`.
- ✅ Tabelas `plans`, `subscriptions`, `account_plans`, `payment_events`.
- ⛔ Enforcement em runtime: middleware que conte runs do mês contra `monthly_runs_limit` e retorne **402** quando estourar.
- ⛔ Enforcement de `max_installed_packages`.

#### 2.6 Segurança
- ✅ RLS em todas as tabelas (autor/admin/self) e `has_role()` security definer.
- ✅ Tokens MCP armazenados como hash sha256 com prefix exibível.
- ⛔ Throttle por IP em `validateMcpToken` (hoje é oráculo de hashes).
- ⛔ Rate-limit por token em `upload_packages` (tem `max(10)` arquivos, sem limite de bytes/taxa).
- ⛔ Rodar `security--run_security_scan` antes do próximo release.

#### 2.7 IA assistida (forge / autor / evaluator)
- ✅ Pipelines de geração (`forge-loop`, `author`, `evaluator`, `autolearn`) e relatórios `/forge/report/$slug`.
- ✅ `package_evaluations` com scores e adversarial results.
- ✅ Página `/evaluation`, `/evolution`, `/skillforge`.

---

### 3. Backlog priorizado (próximos blocos)

**P0 — Fechar loop autor↔consumidor (alto impacto, sem schema novo)**
1. `/account/submissions` + badge no Nav (status/notas + últimos runs 7d).
2. Aba **Insights** em `/souls/$slug` consumindo `package_metrics_daily`.
3. Onboarding "one-click MCP" em `/connect`: bloco que injeta o último token mintado nos JSONs de Cursor/Claude/VS Code + snippet `mcp-inspector`.

**P1 — Discoverability pública**
4. Sort por `install_count` no `/marketplace`.
5. `sitemap.xml` dinâmico com pacotes publicados.
6. `og:image` por pacote em `/souls/$slug` e `/marketplace/$packageId`.

**P2 — Billing e segurança real**
7. Middleware de enforcement (`monthly_runs_limit`, `max_installed_packages`) retornando 402.
8. Throttle por IP em `validateMcpToken` + rate-limit/bytes em `upload_packages`.
9. Rodar `security--run_security_scan` e tratar achados.

**P3 — Notificações**
10. E-mail transacional em approve/reject de revisão.

---

### 4. O que muda no arquivo

Reescrever `.lovable/plan.md` com este conteúdo (mesmas seções), removendo a antiga lista "O que ainda falta" duplicada. Nenhuma mudança em código fora do markdown.
