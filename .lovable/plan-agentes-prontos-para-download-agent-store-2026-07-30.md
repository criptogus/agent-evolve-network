# SDK oficial do SAK (TypeScript + Python)

Sim, é possível — e parte do caminho já existe: `packages/sdk-ts` (`@superagentskill/sdk` v0.2.0) com cliente tipado, retries e idempotência, além da CLI `super-agent`. O que falta para virar oficial: endpoint padrão correto, cobertura da REST API, um SDK Python equivalente, docs e publicação automatizada.

## 1. Corrigir e completar o SDK TypeScript

- Trocar o endpoint padrão de `https://superagentskill.com/api/mcp` para `https://superagentskill.com/api/public/mcp` (o caminho livre de WAF), mantendo `endpoint` sobrescrevível.
- Enviar sempre um `User-Agent` de navegador-like por padrão (`SuperAgentSkill-SDK/x.y (Mozilla/5.0 compatible)`), já que UAs genéricos são bloqueados pelo Cloudflare.
- Adicionar superfície REST além do JSON-RPC MCP, com tipos compartilhados:
  - `review(content, type)` → `POST /api/public/review`
  - `reviewBatch(items)` → `POST /api/public/review/batch` (Pro; erro tipado quando não pago)
  - `listPackages` / `getPackage` / `search`
  - `uploadPackages` (schema estrito `UploadResult`, com espera opcional do job em fila)
  - `listAgents` / `installAgent` / download de bundle (Pro)
  - `certify` / `getCertification`, `reportExecution`, `getMethodology`, `version`
- Erros tipados: `SakAuthError`, `SakPaymentRequiredError`, `SakRateLimitError`, `SakValidationError`, `SakServerError` — todos com `status`, `requestId` e info de rate limit.
- Testes com `fetch` mockado cobrindo retry/backoff, rate limit, propagação de erro e formato de resposta.

## 2. SDK Python (`packages/sdk-py`)

- Pacote `superagentskill` com paridade de superfície: cliente sync (`SuperAgentSkill`) e async (`AsyncSuperAgentSkill`) sobre `httpx`.
- Mesmos defaults: endpoint público, UA browser-like, retry com backoff, chaves de idempotência, exceções espelhando as do TS.
- Modelos tipados com dataclasses/TypedDict, `py.typed`, suporte Python 3.9+.
- Build com `pyproject.toml` (hatchling) e testes com `pytest` + respostas HTTP mockadas.

## 3. Fonte única de verdade dos tipos

- Gerar os tipos de ambos SDKs a partir de um contrato único no repo (schemas Zod já existentes em `src/lib`), exportando um `openapi.json` publicado em `/api/public/openapi.json`.
- Script `scripts/gen-sdk-types.mjs` roda no CI e falha se os SDKs estiverem fora de sincronia com o contrato.

## 4. Documentação

- Nova rota `/docs/sdk` com abas TypeScript e Python: instalação, autenticação (Bearer via OAuth/CLI), quickstart de review, batch review, upload e agents, tratamento de erros e nota sobre User-Agent.
- Links a partir de `/docs`, `/docs/mcp`, `/welcome` e `llms.txt`, mais READMEs dos dois pacotes.

## 5. Release automatizado (GitHub Actions)

- `.github/workflows/release-sdk.yml`: dispara em tags `sdk-ts-v*` e `sdk-py-v*`, roda build + testes, publica no npm (`NPM_TOKEN`) e no PyPI (`PYPI_TOKEN`), gera release notes a partir do CHANGELOG.
- Você só precisa adicionar os dois secrets no repositório; a publicação vira `git tag`.
- Versionamento SemVer alinhado com `scripts/bump-version.mjs` e entrada no `CHANGELOG.md`.

## Detalhes técnicos

- Nenhuma mudança de comportamento nas rotas existentes; a REST API atual já cobre tudo que o SDK vai chamar. Se surgir lacuna (ex.: listagem de agents em REST puro), adiciono uma rota fina sob `src/routes/api/public/`.
- Auth é sempre Bearer do Supabase (mesma sessão do MCP/CLI); os SDKs não guardam credenciais em disco — leem de argumento ou `SAK_TOKEN`.
- Os pacotes ficam fora do bundle do app (apenas `packages/*`), então não afetam o build do site.
