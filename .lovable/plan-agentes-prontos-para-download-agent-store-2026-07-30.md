# Agentes prontos para download (Agent Store)

Sim, é totalmente possível — e a plataforma já tem 80% da fundação: a tabela `packages` já suporta os tipos `soul`, `skill`, `playbook` e `guardrail`, já existe bundle (`packs` + `pack_items`), export de conteúdo em `/api/skills/$slug/export` e `/api/packs/...download.$ext`, e a checagem de assinatura `has_active_paid_subscription()`.

O que falta é a camada "Agente": um pacote curado que junta **1 soul + N skills + N playbooks** e é entregue pronto para uso.

## Decisões já tomadas
- **Acesso:** exclusivo Pro (assinantes). Visitantes veem a vitrine e o preview; o download exige plano Pro.
- **Entrega:** três formatos — ZIP com pasta de arquivos, instalação via MCP, e copiar/colar do system prompt.
- **Conteúdo:** soul, skills e playbooks escritos por nós agora (curados), com qualidade alvo nota A no próprio motor de avaliação.

## Catálogo inicial (13 agentes)

| Agente | Foco |
| --- | --- |
| CEO | estratégia, priorização, comunicação com board e time |
| COO | operação, rituais, OKRs, gargalos e processo |
| CTO | arquitetura, trade-offs técnicos, roadmap de engenharia |
| CMO | posicionamento, funil, mensuração de marketing |
| Diretor de RH | recrutamento, performance, cultura, conversas difíceis |
| Agent Builder | expert em criar/avaliar outros agentes e skills |
| Finanças Corporativas | modelagem, unit economics, fluxo de caixa, valuation |
| Board Meetings | pauta, deck, atas, follow-ups e perguntas do conselho |
| Google Ads | estrutura de conta, keywords, criativos, otimização |
| Meta Ads | públicos, criativos, escala e diagnóstico de performance |
| Newsletter | copy de e-mail, ganchos, cadência |
| LinkedIn | posts, storytelling B2B, autoridade |
| X (Twitter) | threads, hooks, ritmo de publicação |

## Experiência do usuário

1. `/agents` — vitrine com cards por agente (função, o que ele faz, o que vem dentro, badge de trust/score).
2. `/agents/$slug` — página do agente: descrição, soul preview, lista de skills e playbooks, exemplos de uso, seção "compatível com Claude / Hermes / ChatGPT / Cursor".
3. Três botões de entrega:
   - **Download .zip** → `AGENT.md` (soul), `skills/*.md`, `playbooks/*.md`, `README.md` com instruções por cliente.
   - **Instalar via MCP** → comando pronto (`install_agent <slug>`) usando o endpoint `/api/public/mcp`.
   - **Copiar system prompt** → bloco único para colar no ChatGPT/Claude web.
4. Sem Pro: os botões viram CTA de upgrade, com preview parcial do soul (primeiras linhas) para gerar desejo.

## Estrutura técnica

- **Banco (migration):**
  - `agents` (id, slug, name, role, tagline, description, long_description, cover_emoji, soul_package_id, is_published, sort_order, latest_version, download_count, timestamps).
  - `agent_items` (agent_id, package_id, role: `skill` | `playbook` | `guardrail`, sort_order).
  - `agent_downloads` (user_id, agent_id, format, created_at) para métrica de conversão.
  - GRANTs explícitos + RLS: `anon`/`authenticated` só leem agentes publicados; escrita só admin (`has_role`); `agent_downloads` só o próprio usuário.
- **Server functions** em `src/lib/agents/agents.functions.ts`: `listAgents`, `getAgent` (público, conteúdo truncado sem Pro), `getAgentBundle` (exige Pro via `has_active_paid_subscription`).
- **Rotas de entrega:**
  - `src/routes/api/agents.$slug.download.$ext.ts` → `zip` e `md`, com guarda de sessão + Pro (mesmo padrão do download de packs).
  - Ferramenta MCP `install_agent` em `src/lib/mcp/tools/` retornando os arquivos do agente (bloqueia não-Pro com mensagem clara de upgrade).
- **Conteúdo:** cada agente entra como registros em `packages` + `package_versions` (soul/skill/playbook), então herda avaliação, trust score e versionamento existentes — nada de conteúdo hardcoded em componente.
- **Frontend:** `src/routes/agents.index.tsx`, `src/routes/agents.$slug.tsx`, componentes em `src/components/agents/` (`AgentCard`, `AgentBundleTree`, `DeliveryButtons`, `ProGate`), com `head()` próprio em cada rota para SEO.
- **Landing e navegação:** item "Agents" na `Nav`, seção na home e link em `/pricing` como benefício Pro.

## Entrega em fases

1. **Fase 1** — schema, RLS/GRANTs, server functions, rotas `/agents` e `/agents/$slug`, gate Pro, download ZIP.
2. **Fase 2** — conteúdo curado dos 13 agentes (soul + 3–5 skills + 2–3 playbooks cada), publicados via migration/seed.
3. **Fase 3** — ferramenta MCP `install_agent`, copiar/colar, contadores de download e destaque na home/pricing.
