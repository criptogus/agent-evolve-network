# Corrigir os 5 gaps do feedback do cliente

## 1. Upload quebrado (crítico)

Confirmado na base: os jobs de upload que falharam morreram com
`No object generated: response did not match schema` em todos os modelos.
Causa: o schema pedido ao modelo tem restrições rígidas (slug só minúsculas,
description entre 20 e 280 chars, long_description ≥ 40, system_prompt ≥ 60).
Quando o modelo entrega algo levemente fora (slug com maiúscula, description
de 300 chars), a resposta inteira é descartada e a cadeia de fallback queima
o orçamento até dar timeout.

Correções:
- Pedir ao modelo um schema **sem restrições** (só os campos e tipos), e
  aplicar as regras depois em código: slugify, cortar description em 280,
  completar textos curtos (já existe `hydrateDraftFromMinimal` para isso).
- Reparo determinístico antes de validar: normalizar `type`, gerar slug a
  partir do nome/arquivo, deduplicar exemplos.
- **Fallback sem LLM**: se todos os modelos falharem, montar o draft a partir
  do próprio arquivo (título do H1/nome do arquivo, primeira frase como
  description, conteúdo como system_prompt) e marcar o pacote como
  `needs_refinement`. Assim `upload_packages` nunca devolve falha total.
- Registrar no job qual caminho foi usado (structured / texto / determinístico)
  para diagnóstico.

## 2. Penalidade de português

- Normalizar tipografia e acentos antes de detectar (NFC, `—`/`–` → `-`,
  `…` → `...`, aspas curvas → retas).
- Baixar o limiar de "other": hoje um doc com muito jargão inglês cai em
  `other` com confiança 0.4. Passa a valer: se houver qualquer evidência de
  ortografia PT/ES/FR/IT, o idioma é decidido por ela; `other` só quando não
  há nenhum sinal.
- `other` deixa de zerar benefícios: o teto não-EN (68) e as mensagens
  localizadas passam a valer também para detecção de baixa confiança em
  script latino.

## 3. `input_warning` falso positivo

- Aplicar a mesma normalização tipográfica antes do scan de truncamento, para
  que em-dash e ellipsis nunca sejam considerados marcadores.
- Desacoplar aviso de bloqueio: `input_warning` passa a ser **informativo**.
  O semantic/substance pass só é bloqueado por `short_input` (< 400 chars)
  ou por marcador explícito de elisão (`[truncated]`, `[...]` isolado em
  linha). Nenhum outro aviso desliga o juiz LLM.
- A resposta passa a dizer explicitamente se o aviso bloqueou ou não o pass.

## 4. 403 Cloudflare em IP residencial

Não é possível alterar regras de WAF daqui. O que faremos:
- Reforçar na documentação (`/docs/mcp` e `/welcome`) o endpoint
  `/api/public/mcp` e o header `User-Agent` de browser, com exemplos prontos.
- Adicionar um endpoint de diagnóstico simples que devolve o que o servidor
  viu (IP class, UA, se passou), para o cliente confirmar o bloqueio em 1 curl.

## 5. Delta tracking (histórico de avaliação)

Hoje o delta depende do caller enviar `previous_hash`. Passa a ser servidor:
- Nova tabela `skill_review_runs` (id, user_id, doc_key, doc_hash,
  overall_score, format_score, substance_score, grade, language, created_at),
  com RLS de dono + GRANTs.
- `review_skill` grava a run quando a sessão MCP está autenticada e devolve
  `history` (últimas 10 runs) + `delta_vs_previous` automaticamente, sem o
  agente ter que guardar nada.
- Para chamadas anônimas nada muda (segue o modo stateless atual).

## Detalhes técnicos

- Arquivos: `src/lib/skills/schemas.ts`, `src/lib/admin/author.server.ts`,
  `src/lib/uploads/uploads.server.ts` + `queue.server.ts` (marcar caminho de
  geração), `src/lib/mcp/lang-detect.ts`, `src/lib/mcp/tools/skills.ts`,
  `src/routes/docs.mcp.tsx`, `src/routes/welcome.tsx`, uma migration nova.
- Testes: estender `tests/lang-detect.test.mjs` (PT com jargão + tipografia),
  novo teste para o reparo determinístico do draft e para `inputWarning` com
  em-dash/ellipsis.
- Observação: várias correções de idioma/truncamento já existem no código mas
  o cliente pode estar batendo na versão publicada antiga — vale republicar
  depois do merge.
