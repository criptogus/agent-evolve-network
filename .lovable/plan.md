## Objetivo

Fechar o core loop do produto atacando os 3 bloqueadores do Tier 1 na ordem 1→2→3, e resolver a integração Hermes com um script hospedado. Cada passo tem critério de sucesso mensurável.

---

## Passo 1 — Consertar `upload_packages` (core loop)

**Sintoma:** `No object generated: response did not match schema` + timeout no `upload_packages`.

**Causa raiz:** `PackageDraftSchema` (108 linhas em `src/lib/skills/schemas.ts`) é muito exigente para o structured-output dos providers:
- 8 campos top-level, muitos deles obrigatórios com min-length agressivo (`system_prompt >=120`, `long_description >=80`)
- `examples` exige `>=2` itens, cada um com 4 campos
- `rules.input_schema` é `z.record(z.any())` — providers em strict mode rejeitam `additionalProperties`
- Arrays opcionais (`mcp_servers`, `permissions`, `live_resources`) inflam o schema JSON e degradam o modelo
- Budget de 12s/tentativa não sobra para o modelo gerar ~2KB de JSON válido

**Fix:**
1. **`schemas.ts`** — criar `PackageDraftMinimalSchema` só com `{ slug, name, type, description, long_description, system_prompt, examples[>=1] }`. Todos os outros campos viram opcionais e são preenchidos com defaults sensatos no pós-processamento (não no schema do LLM).
2. **`author.server.ts`** — reescrever `generateDraft`:
   - Usar `PackageDraftMinimalSchema` no `Output.object`
   - Aumentar timeout para 25s por tentativa (Vercel/Cloudflare Workers tem 60s; 25×2 tentativas + overhead = 55s)
   - Trocar ordem: `google/gemini-2.5-flash` primeiro (rápido e barato, suficiente pro schema mínimo) → `google/gemini-2.5-pro` (fallback qualidade) → text fallback já existente
   - Pós-processar: preencher `rules`, `compatibility`, `scopes` com defaults ANTES de gravar em `packages`/`package_versions`
3. **`uploads.server.ts`** — mudar `INLINE_BUDGET` de 1 para 0. Ou seja: **tudo vira fila**. O MCP responde em <2s com `queued: [...]` e o worker processa em background. Elimina totalmente o risco de timeout no request principal.
4. **`packages.upload.ts` (REST)** — mesma coisa: enfileirar em vez de processar inline.
5. **Migration** — nada novo aqui; a fila `package_upload_jobs` já existe.

**Critério de sucesso:** subir 3 skills pelo MCP retorna `{queued: 3, uploaded: 0, next_step: "..."}` em <3s, e todas aparecem em `/account/packages` em <2min.

---

## Passo 2 — Desbloquear Cloudflare 403 (porta de entrada)

**Sintoma:** `urllib.error.HTTPError: HTTP 403 Access denied (Ray ID: ...)` na primeira chamada MCP de agentes em ambientes Vercel/Replit/Codespaces.

**Causa raiz provável:** Cloudflare Bot Fight Mode classifica UAs de runtimes (`python-urllib`, `node-fetch`, `curl` sem TLS handshake fresh) como bots.

**Fix — em camadas, todas server-side (não mexemos no Cloudflare do domínio):**
1. **`src/routes/api/mcp.ts` e `src/routes/api/public/mcp.health.ts`** — garantir que:
   - `OPTIONS` retorna 204 com CORS liberado
   - Responde a `GET` (não só POST) com um payload de `{ ok: true, hint: "POST JSON-RPC..." }` — hoje um GET pode cair no fallback do CF e virar 403 antes de chegar ao Worker
   - Aceita `User-Agent` vazio ou qualquer UA — sem checagem local
2. **Novo endpoint público `/api/public/mcp.probe`** que responde 200 a qualquer método com um JSON estático — serve como "health check anônimo" que o cliente NPM (Passo 4) usa antes de mandar chamadas reais. Se o probe passar mas a chamada real falhar, é WAF; se ambos falharem, é rede.
3. **Documentar em `/docs/mcp`** que `curl -H "Accept: application/json, text/event-stream"` é obrigatório, e recomendar o cliente oficial (Passo 4) para não lidar com SSE parsing.
4. **NÃO** vou fazer whitelist de IPs no Cloudflare — isso é ação manual no dashboard e o usuário disse que não tem acesso ao Supabase dashboard; presumo mesma coisa para Cloudflare. Se precisar, vou reportar como próximo passo manual.

**Critério de sucesso:** `curl -X POST https://superagentskill.com/api/mcp` de um IP de Replit retorna 200 (não 403).

---

## Passo 3 — Estabilizar semantic pass (diferencial)

**Sintoma:** `gateway_unavailable_or_errored` + falso positivo do `input_warning` por causa de `...` em code blocks.

**Causa raiz:**
- Semantic pass é síncrono e bloqueia a resposta do `review_skill`; qualquer glitch no gateway derruba o pillar
- Detector de truncamento não distingue `...` dentro de fence de código vs prosa

**Fix:**
1. **`src/lib/mcp/tools/skills.ts`** — no `review_skill`:
   - Ajustar heurística de `input_warning`: só flagar `...` quando aparece fora de code fences (` ``` ... ``` ` e ` ` ` ` `` ` `) E fora de aspas
   - Wrap do semantic pass em retry (2 tentativas com backoff 500ms) + fallback graceful: se o gateway falhar, retornar `semantic_pass: { status: "unavailable", pillars_affected: [...] }` em vez de matar o report inteiro
   - Sinalizar no scorecard `plateau_reason: "non_english_content"` quando `lang != "en"` e semantic pass ficou degradado — resolve o item 7 do feedback (transparência PT)
2. Corrigir a contradição do pillar Portabilidade: se `signals_matched == 0`, forçar `score = baseline` (não 68) — item 8 do feedback.

**Critério de sucesso:** rodar `review_skill` no mesmo skill 3x seguidas retorna semantic pass funcionando em ≥2/3 e nunca joga fora o report inteiro por falso positivo.

---

## Passo 4 — Bônus: script Hermes hospedado

Cria `src/routes/api/public/install.hermes.sh.ts` que serve um bash script:

```bash
curl -fsSL https://superagentskill.com/install/hermes.sh | bash
```

O script:
1. Detecta o path do `~/.hermes/config.yaml`
2. Faz backup (`config.yaml.bak.<timestamp>`)
3. Adiciona um bloco `mcp_servers: superagent-skill: ...` idempotente (não duplica se já existir)
4. Sugere ao usuário rodar `hermes mcp list` para validar

Também adiciona um botão de copiar comando na `/welcome` para o card do Hermes.

**Critério de sucesso:** rodar o one-liner num Hermes limpo faz a tool `review_skill` aparecer em `hermes mcp list`.

---

## Detalhes técnicos

**Arquivos alterados:**
- `src/lib/skills/schemas.ts` — novo `PackageDraftMinimalSchema`
- `src/lib/admin/author.server.ts` — nova ordem de fallback, timeout maior, pós-processamento
- `src/lib/uploads/uploads.server.ts` — `INLINE_BUDGET = 0`
- `src/lib/uploads/queue.server.ts` — usar schema minimal
- `src/lib/mcp/tools/skills.ts` — heurística `...`, retry semantic, fix pillar 0/6
- `src/routes/api/mcp.ts` — GET response, CORS
- `src/routes/api/public/mcp.health.ts` — reforçar
- `src/routes/api/public/mcp.probe.ts` — novo
- `src/routes/api/public/install.hermes[.]sh.ts` — novo
- `src/routes/welcome.tsx` — botão do script Hermes

**Sem migrations novas.** Estruturas de fila já existem.

**Verificação:** após cada passo, rodar `code--exec bun run typecheck` e testar via `curl` contra o preview.

---

## Fora do escopo (Tier 2/3, ficam para depois)

- Marketplace seeding com 30-50 skills (item 5)
- Client oficial `npx superagent-eval` (item 6) — o script Hermes cobre parte disso
- PR oficial no repo do Hermes
- Verified badge, pricing freemium, multi-idioma es/fr/de

Confirma este plano? Assim que aprovar, executo os 4 passos em sequência e volto com relatório do que passou/falhou.