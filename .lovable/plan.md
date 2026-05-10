
## Objetivo

Sair do mock. Cada execução real treina o ranking, cada feedback via MCP gera sugestões de upgrade de pacote, e a primeira série de 6 pacotes (skill/playbook/soul/guardrail) é executável de verdade pela IA.

## 1. Infra: Lovable Cloud + Auth

- Habilitar Lovable Cloud.
- Auth: email/senha + Google.
- Tabela `profiles` (id → auth.users, display_name, avatar_url, handle) + trigger de criação.
- Tabela `user_roles` separada (`app_role` enum: admin, publisher, user) + função `has_role` SECURITY DEFINER (padrão anti-recursão RLS).
- Rota `/login`, `/reset-password`, layout `_authenticated` com guard `beforeLoad`.

## 2. Catálogo real (6 pacotes curados)

Tabelas:
- `packages` (id, slug, name, type, author_id, description, long_description, license, latest_version, scopes[], is_published, created_at)
- `package_versions` (id, package_id, version, status, notes, system_prompt, rules_json, examples_json, compatibility_json, created_at) — **conteúdo executável real**
- `package_dependencies` (package_id, depends_on_slug, version_range)

Seed inicial (3 verticais × 2 tipos cada para cobrir os 4 tipos):
1. **skill** `cardiology-triage` — prompt clínico estruturado + JSON schema de output (GRACE score, diferencial).
2. **skill** `enterprise-discovery` — MEDDPICC tool calls com schema.
3. **playbook** `saas-cold-outreach` — sequência de passos com decisão por estado.
4. **playbook** `incident-response-sev1` — runbook com escalonamento.
5. **soul** `jobs-product-taste` — system prompt de personalidade + heurísticas de decisão.
6. **guardrail** `pii-redactor` — regex + LLM judge para PII; bloqueia/redige outputs.

Cada pacote: `system_prompt` real, `rules_json` (input/output schema Zod-like), `examples_json` (3+ exemplos com expected output), `compatibility_json`.

## 3. Execução real (IA via Lovable AI Gateway)

Server functions em `src/lib/`:
- `runs.functions.ts` → `executeAgent({ packageSlugs[], userPrompt })`:
  - Carrega versions ativas dos pacotes selecionados.
  - Compõe system prompt (souls + skills + playbooks) + injeta guardrails como pre/post processors.
  - Chama `streamText` com `google/gemini-3-flash-preview`, tools derivadas do `rules_json`.
  - Mede latência, tokens, eventual `judge` call para precision/hallucination score.
  - Persiste em `runs` + `run_events`.
- `/generate` chama isso de verdade (substitui o gerador mock).
- `/evolution` consome um stream real do mesmo endpoint, mostrando steps reais.

Tabelas:
- `runs` (id, user_id, prompt, package_ids[], started_at, ended_at, status, latency_ms, tokens_in, tokens_out, health, precision, hallucination_rate, output_text)
- `run_events` (run_id, ts, kind, payload_json) — para timeline real.

## 4. Network effect — três mecânicas combinadas

### a) Telemetria + ranking adaptativo
- `package_metrics_daily` (package_id, day, runs, avg_latency, avg_health, avg_precision, hallucination_rate, install_count) — atualizada por trigger ao fechar `run`.
- View `package_rankings` ordenando marketplace por score híbrido: `0.4*precision + 0.3*health + 0.2*log(runs+1) + 0.1*recency`.
- Marketplace e `/discover` passam a ler dessa view (ordem muda com uso real).

### b) MCP feedback loop (auto-evolução)
- Server route `POST /api/public/mcp/feedback` com auth via API token + Zod (verifica `signature` HMAC do agente).
- Recebe `{ run_id?, package_slug, kind: "miss"|"hallucination"|"win"|"suggestion", evidence, suggested_patch? }`.
- Insere em `learnings` (package_id, kind, evidence_json, embedding via gateway embeddings, weight).
- Job server function `evolvePackages()` (cron via pg_cron chamando `/api/public/cron/evolve`):
  - Agrupa learnings por package + cluster semântico (cosine sim).
  - Quando cluster atinge threshold (≥10 sinais consistentes), chama IA com prompt de "patch maintainer" → gera `package_versions` em status `beta` com diff de prompt/rules.
  - Notifica autor; promoção a `stable` requer aprovação ou auto-promove se métricas em A/B sandbox melhorarem.
- Página `/evolution` mostra o **loop real** (não mais sintético): origem dos learnings, candidate versions, A/B results.

### c) Reviews + uso verificado
- `reviews` (id, package_id, user_id, rating 1-5, body, run_id_ref, created_at) — apenas usuários com `runs.status='ok'` para o package podem inserir (RLS check).
- `review_helpfulness` para ponderar.
- Score público = média ponderada por (helpfulness + número de runs do reviewer com aquele package).

## 5. UI — substituir mocks

- `/marketplace` → query real (`packages` + `package_rankings`), filtros por tipo/runtime/score.
- `/marketplace/$packageId` → versions reais, métricas reais agregadas, reviews reais, botão "Try in /generate" pré-seleciona o pacote.
- `/generate` → composer agora aceita seleção multi-package, run real com streaming, salva `run` no histórico do usuário; presets agora persistem na nuvem (tabela `presets`) com sync entre devices. Mantém share-link.
- `/evolution` → consome `learnings` + `candidate_versions` reais; auto-run/manual continuam.
- `/discover` → feed ordenado por ranking adaptativo + "trending learnings" (clusters quentes).
- `/skillforge` → editor para autores publicarem pacotes (system_prompt, rules schema, examples, compat); submit cria `package_versions` em `beta`.

## 6. Endpoint MCP do AgentForge

Usar `mcp-tanstack-start` em `src/routes/api/mcp.ts` expondo tools reais:
- `search_packages({ query, type })`
- `install_package({ slug, version })` (registra install no usuário autenticado via bearer)
- `report_learning({ package_slug, kind, evidence, suggested_patch? })`
- `run_agent({ package_slugs, prompt })`
Auth via `MCP_TOKEN` por usuário (gerado em `/settings/api`).

## 7. Segurança e qualidade

- RLS em todas as tabelas; políticas via `has_role` para admin/publisher.
- `LOVABLE_API_KEY` apenas em server fns / server routes.
- Validação Zod em todos os inputs (server fns e MCP).
- Rate limit por user_id no `/api/public/mcp/feedback` (tabela `rate_limits`).
- Embeddings via `google/gemini-3-flash-preview` ou modelo embeddings disponível no gateway.

## 8. Detalhes técnicos (resumo)

```text
src/
  routes/
    _authenticated/
      generate.tsx           (move; era /generate)
      evolution.tsx
      skillforge.tsx
      settings.api.tsx       (MCP token mgmt)
    login.tsx, reset-password.tsx
    marketplace.index.tsx, marketplace.$packageId.tsx, discover.tsx  (públicas)
    api/
      mcp.ts                          (mcp-tanstack-start)
      public/mcp/feedback.ts          (HMAC + bearer)
      public/cron/evolve.ts           (HMAC do cron)
  lib/
    packages.functions.ts   (list/get/publish)
    runs.functions.ts       (executeAgent streaming)
    learnings.functions.ts  (ingest + cluster + evolve)
    reviews.functions.ts
    ai-gateway.ts           (helper Lovable AI Gateway)
  integrations/supabase/{client,client.server,auth-middleware}.ts
```

Migrações SQL: enums (`package_type`, `app_role`, `run_status`, `learning_kind`), tabelas, índices (vector index para embeddings via pgvector), políticas RLS, trigger de profile, trigger de update de `package_metrics_daily`, função `has_role`.

## 9. Entregáveis desta rodada

1. Cloud + auth (email/Google) + profiles/roles.
2. Schema completo + seed dos 6 pacotes reais.
3. Execução real `/generate` via gateway com persistência.
4. Marketplace lendo ranking real.
5. `/evolution` mostrando loop real (mesmo que com poucos dados no início).
6. Endpoint MCP `/api/mcp` com 4 tools + token por usuário.
7. Cron de evolução + ingest de learnings + cluster por embedding.
8. Reviews verificados.

Posso começar a implementar quando você aprovar.
