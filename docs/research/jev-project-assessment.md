# Jev no Super Agent Skill: avaliação de integração

Data: 2026-10-24. Base de código: `a71b03123b0bc29ad4e34733711b6a30a9973278` (plataforma 0.6.8). Conclusão: **vale integrar primeiro na descoberta e pré-seleção de capacidades, como piloto medido; não substituir geração ou aprovação adversarial**. Nenhuma integração, configuração, migração ou publicação foi feita nesta avaliação.

## Onde existe oportunidade concreta

| Fluxo atual | Evidência no código | Uso proposto | Prioridade / limite |
| --- | --- | --- | --- |
| Agent Match | `src/lib/match/match.functions.ts`: até 800 pacotes aprovados/publicados, descrição truncada em 180 caracteres, mais catálogo de MCPs enviados a GPT-5.2 | Recuperar shortlist por busca lexical/semântica e tipo; Jev reranqueia candidatos; gerador recebe finalistas e escreve justificativa, kit e lacunas | Alta: principal candidato a diminuir contexto do gerador. Manter diversidade por tipo, opção nenhum e recuperação ampliada para evitar falsos descartes |
| Descoberta MCP | `src/lib/mcp/tools/skills.ts`, `searchRegistryTool`: SQL com ILIKE, ordenado por instalações; `src/lib/mcp/tools/onboarding.ts`: recomendação determinística por popularidade/fit/trust | Reranqueamento opcional quando houver intenção textual específica; resposta resumida e carregamento integral sob demanda | Alta para relevância; economia de tokens do agente consumidor precisa ser medida. A busca atual não gasta tokens de modelo no servidor |
| Revisão de skills | `semanticCheck` em `src/lib/mcp/tools/skills.ts`: geração de parecer por pilares, trechos e tentativas alternativas; já existe cache em processo por conteúdo/opções | Classificação e verificação de candidatos a trechos antes de revisão completa, inicialmente somente observação | Média: Jev não fornece a justificativa livre atual e não deve remover evidência obrigatória. Cache já existente reduz o ganho marginal |
| Seleção de drafts/agrupamento de falhas | `src/lib/skills/pipelines.server.ts`: múltiplos drafts, crítico, juízes e auto-learn | Classificar temas e priorizar revisão; comparar com o comportamento atual | Posterior: não tratar triagem como aprovação nem pular testes exigidos |
| Geração, pesquisa e reparo | `src/lib/admin/author.server.ts`, `src/lib/admin/research.server.ts`, `src/lib/agents/factory.server.ts`, `src/lib/packs/pipeline.server.ts` | Manter modelo generativo; possível redução apenas do contexto de entrada | Jev não substitui escrita de código, pesquisa na web ou produção de texto livre |
| Autorização, cálculos, publicação, compatibilidade | Gates e runtime já existentes | Manter determinísticos e vinculados à evidência | Sem delegar autoridade ao Jev; as 21 skills continuam restritas ao modelo/runtime validado |

Adicionar Jev sem retirar contexto ou chamadas existentes aumenta a carga. O uso do Jev pelo Codex nesta conversa não implica integração dentro do produto ou redução automática dos tokens dos clientes MCP.

## Piloto real executado

Comando reutilizável (a pasta de saída deve ser nova; o helper utiliza a chave no Keychain sem expô-la):

```sh
node scripts/benchmark-jev-discovery.mjs artifacts/NEW_JEV_PILOT /Users/gustavocaetano/.codex/skills/jev-codex/scripts/jev.py
```

O script reaproveita o helper existente. Rejeita conjunto vazio/incompleto e sobrescrita da evidência; preserva entrada, distribuição de probabilidades, modelo efetivo, consumo e tempos. Usa somente metadados locais das 21 skills e briefs sintéticos. Não executa skills, consultas de usuários, agentes nem chamadas Lovable.

Resultado em `artifacts/research-jev-discovery-20261024/report.json` e `raw-results.json`:

- Modelo solicitado e efetivo: **jev-1.14.0**.
- **8/8 seleções esperadas**: seis tarefas em português/inglês e duas sem candidato adequado. Expectativas declaradas antes das chamadas.
- Latência observada por chamada: **222–295 ms**, mediana **246 ms**, incluindo ida/volta do helper neste computador. Oito amostras não estabelecem um SLA ou p95 de produção.
- Uso reportado pelo provedor: **18.540 tokens de entrada e 2.395 de saída** no lote completo, sem falhas e com uma tentativa por chamada.
- Pelo preço documentado de US$ 0,042/M de entrada e saída gratuita, custo de inferência **estimado em US$ 0,00077868** para o lote. Não é reconciliação de fatura nem projeção mensal.

É um smoke test de seleção simples e reconhecível, sem ground truth independente e sem comparação A/B com o Agent Match atual. Não mede geração final, catálogo completo, ataques, recuperação lexical, consumo faturado do cliente MCP ou economia total de tokens/custo. A quantidade de metadados retornada caiu porque foi escolhida uma skill; isso não autoriza extrapolar a mesma redução para kits compostos ou tokens do fluxo completo.

## Integração recomendada

```text
brief → filtros de publicação/tipo/compatibilidade → recuperação de candidatos
      → Jev (relevância, nenhum, incerteza) → finalistas
      → gerador (kit e justificativa) → validações existentes
```

1. Adaptador **server-only separado do gateway generativo**, com modelo fixado, schema validado, limite de candidatos/contexto, timeout, orçamento e retries limitados. A configuração atual permite fallback para Lovable; o caminho Jev deve ter seu próprio provedor explícito e não disparar geração Lovable durante avaliação.
2. Usar apenas metadados públicos e briefs sintéticos no primeiro experimento. Consultas reais podem conter dados privados; não presumir que ser dado de busca autoriza repassá-lo a outro provedor. A política do fornecedor não equivale a retenção zero.
3. Cache exato por hash de consulta normalizada, candidatos e versões, critérios e modelo; revalidar visibilidade e compatibilidade antes do uso. Nunca reutilizar conteúdo privado entre tenants. Não trocar texto integral por resumo quando isso apaga requisitos ou evidência.
4. Modo de observação em conjunto congelado e rotulado antes de mudar o resultado mostrado. Incluir pedidos compostos, ambíguos, nenhum candidato, português, nomes semelhantes, opções reordenadas e injeção em descrições/consultas. Medir recall top-k e perdas da shortlist, não somente acerto top-1.
5. Falhas, ambiguidade ou cobertura insuficiente retornam ao caminho atual/recuperação ampliada. Registrar a taxa e o custo desse fallback; incerteza não deve eliminar silenciosamente uma opção necessária.
6. Registrar consumo real de cada estágio. `matchAgentToPackages` não captura `usage` na chamada atual; a telemetria de eficiência presente no avaliador não mede por si o custo deste fluxo.

## Como decidir a ativação

Comparar as mesmas tarefas com/sem Jev, medindo: input/output de todos os modelos, custo total, chamadas evitadas, cache hits, fallback, latência p50/p95, qualidade do kit e êxito final. Preservar controles, compatibilidade e critérios adversariais existentes. Aceitar somente ganho de custo/latência demonstrado com qualidade mantida ou superior; calibrar limiares com o conjunto rotulado, sem usar uma confiança universal como aprovação.

A economia líquida por tarefa é:

```text
custo_atual − (custo_Jev + custo_gerador_reduzido + retries/fallbacks)
```

Menos tokens caros do gerador pode reduzir custo mesmo se a soma de tokens crescer. Para reduzir também o total de tokens, os tokens retirados precisam superar a entrada/saída adicional de Jev e de eventuais fallbacks. Atualmente não há evidência suficiente para prometer um percentual ou valor mensal.

## Fontes

[Capacidades e pesquisa oficial verificadas](jev-official-capabilities.md), [Models/preço](https://docs.typesafe.ai/models.md), [seleção de skills](https://docs.typesafe.ai/cookbooks/skill_suggestion.md), [reranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md), [confiança](https://docs.typesafe.ai/confidence.md), [privacidade](https://typesafe.ai/legal/privacy-policy).
