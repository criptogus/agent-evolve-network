# Plano: 20 novos agentes corporativos no Agent Store

## Objetivo
Expandir o Agent Store com 20 agentes corporativos prontos para uso, cada um com soul, skills, playbooks e guardrails embutidos, alinhados ao padrão dos 13 agentes já publicados. Todos devem ser instaláveis via ZIP, MCP e copy/paste, e servir de templates customizáveis na Agent Factory.

## Os 20 agentes propostos

### Liderança e estratégia
1. **CMO Agent** — estratégia de marca, posicionamento, orçamento de marketing e funnel integrado.
2. **CHRO / Head of People Agent** — cultura, performance, compesnsação, organização e employee experience.
3. **CPO / Head of Product Agent** — product discovery, roadmap, priorização e métricas de produto.
4. **CRO / Revenue Officer Agent** — alinhamento de vendas, marketing e CS em torno da receita.
5. **Chief of Staff Agent** — coordenação executiva, priorização, comunicação e ritmos de governança.

### Go-to-market e vendas
6. **VP Sales / Sales Leader Agent** — pipeline, forecast, processo de vendas B2B e enablement.
7. **Demand Generation Agent** — geração de MQL/SQL, campanhas, lead scoring e nurturing.
8. **Customer Success Agent** — health score, expansão, churn prevention e QBRs.
9. **Partnerships / BD Agent** — estratégia de parcerias, pipeline de deals e contratos de canal.
10. **Investor Relations Agent** — comunicação com investidores, KPIs e materials de follow-on.

### Operações e enablement
11. **RevOps Agent** — dados de receita, processos entre vendas/marketing/CS e tech stack.
12. **Data Analytics Lead Agent** — métricas, dashboards, experimentos e storytelling com dados.
13. **Talent Acquisition / Recruiting Agent** — sourcing, entrevistas, employer brand e candidate experience.
14. **Customer Support / CX Ops Agent** — triagem, SLAs, knowledge base e melhoria contínua.
15. **Procurement / Vendor Management Agent** — avaliação, negociação e gestão de fornecedores.

### Risco, compliance e finanças
16. **General Counsel / Legal Ops Agent** — contratos, compliance, clauses de risco e playbooks legais.
17. **CISO / Security Lead Agent** — segurança da informação, políticas, incidentes e vendor risk.
18. **FP&A Agent** — orçamento, forecast, variance analysis e modelos driver-based.
19. **ESG / Sustainability Agent** — métricas ESG, relatórios e compliance regulatório.
20. **M&A / Corporate Development Agent** — screening, due diligence, valuation e integração.

## Estrutura de conteúdo por agente
Cada agente segue o padrão `AgentDef`:
- **Soul**: identidade, forma de pensar, formato de resposta, hard rules e tom.
- **3 skills**: capacidades delimitadas com trigger, procedimento, output format e failure modes.
- **2 playbooks**: procedimentos multi-etapa prontos para execução.
- **Guardrails**: embutidos no soul como hard rules (proibições explícitas, exigência de dados verificáveis, limites jurídicos/financeiros).

## Arquivos a criar/editar
- `src/lib/agents/catalog/leadership.ts` — agentes 1–5.
- `src/lib/agents/catalog/gtm.ts` — agentes 6–10.
- `src/lib/agents/catalog/operations.ts` — agentes 11–15.
- `src/lib/agents/catalog/risk-finance.ts` — agentes 16–20.
- `src/lib/agents/catalog.ts` — importar e concatenar os novos arrays em `AGENTS`.
- `src/routes/agents.index.tsx` — meta tags e contagem atualizam automaticamente via `listAgentSummaries`.
- Testes: `tests/agent-catalog.test.mjs` (ou similar) validando que todos os slugs são únicos, skills/playbooks não vazios e soul contém "Hard rules".

## Critérios de qualidade
- Slugs únicos, kebab-case, em inglês para consistência com o catálogo existente.
- Nenhum dado de mercado, benchmark ou número inventado sem label `PLACEHOLDER` ou aviso explícito.
- Regras jurídicas/financeiras/fiscais sempre remetem a profissional qualificado.
- Cada skill tem procedimento numerado e definition of done.
- Cada playbook tem fases temporais ou passos sequenciais.

## Integração com Agent Factory
Os novos agentes aparecerão automaticamente em `list_agents` e `install_agent` do MCP. Na Agent Factory, servirão como "templates de domínio": ao criar um agente customizado, o usuário poderá escolher um agente de base para heredar a estrutura de soul/skills/playbooks e customizar com o brief da empresa.

## Métricas de sucesso
- 20 agentes publicados e instaláveis.
- Catálogo passa de 13 para 33 agentes.
- Teste automatizado garantindo unicidade de slugs e conteúdo mínimo.
- Nenhuma regressão no build (`bun run build` passa).
