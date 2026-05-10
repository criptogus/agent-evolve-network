## O que já está pronto

- Marketplace + página de detalhe de soul (`/souls/$slug`) com download/duplicate.
- Workflow de revisão (`/admin/review`) com publish/pause antes de virar público.
- Versionamento de souls com histórico e rollback.
- `/account/tokens`: criação, guia de uso (`Authorization: Bearer`), copy + validate por snippet.
- `/connect`: painel **Test MCP live** chamando `list_packages`, `search_registry`, `get_package`.
- MCP server (`/api/mcp`) com 5 tools, incluindo `upload_packages` autenticado por token.

## O que ainda falta (proposta priorizada)

### 1. Fechar o loop do MCP no Test MCP
Hoje o tester só cobre 3 read tools. Faltam:
- `request_primitive` (form com `type` + `brief` + `industry`).
- `upload_packages` (textarea com nome+conteúdo+type, toggle `publish`, exige token).
- Botão **"List tools"** que chama `tools/list` e mostra o catálogo real do servidor — prova viva de que o MCP está no ar.
- Persistir o último token usado em `localStorage` (opt-in) para não recolar.

### 2. Onboarding de cliente MCP de ponta-a-ponta
Hoje `/connect` documenta config, mas não fecha o ciclo:
- Bloco **"Conecte seu Cursor/Claude/VS Code"** com JSON pronto contendo o token recém-criado (one-click copy).
- Health check público (`GET /api/public/mcp/health`) retornando `{ ok, version, tools: [...] }` para o usuário validar do terminal.
- Snippet `mcp-inspector` para debug.

### 3. Notificações de revisão
O autor sobe um pacote via `upload_packages` mas não sabe quando foi aprovado:
- Página `/account/submissions` listando os próprios pacotes com `review_status` (pending/approved/rejected) e `review_notes`.
- Badge no Nav quando houver mudança desde a última visita.
- (Opcional) E-mail transacional no approve/reject.

### 4. Métricas por pacote para o autor
A tabela `package_metrics_daily` já existe e ninguém consome:
- Aba **"Insights"** em `/souls/$slug` (visível só ao autor/admin) com runs/dia, latência média, health, hallucination.
- Card "últimas 7d" no `/account/submissions`.

### 5. Discoverability pública
- `/marketplace` hoje só lista. Falta filtro por `type` (skill/playbook/soul/guardrail), busca por texto e ordenação por `install_count`.
- Sitemap dinâmico (`/sitemap.xml`) listando todos os pacotes publicados — hoje só existe `llms.txt`.
- `og:image` por pacote em `/souls/$slug` e `/marketplace/$packageId` (atualmente herdam o do root, sobrescrevendo).

### 6. Billing real
- `pricing.tsx` e `account.billing.tsx` existem mas o gating de plano (`monthly_runs_limit`, `max_installed_packages`) não bloqueia nada em runtime. Falta middleware que conte runs do mês e retorne 402 quando estourar.

### 7. Higiene de segurança
- `validateMcpToken` faz lookup via `supabaseAdmin` sem rate-limit — fácil de virar oráculo de hashes. Adicionar throttle por IP.
- `upload_packages` tem `max(10)` files mas sem limite agregado de bytes nem de taxa por token.
- Rodar `security--run_security_scan` antes de publicar a próxima versão.

---

## Recomendação

Se for escolher **um** próximo bloco, faria o **#1 + #2 juntos** (1–2 telas, alto impacto demo) — fecha a história "minto token → conecto cliente → testo no navegador → uso no Cursor" sem precisar de schema novo.

Me diga qual desses blocos quer que eu detalhe num plano de implementação (ou se prefere combinar dois).
