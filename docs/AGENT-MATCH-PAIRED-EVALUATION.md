# Comparação pareada do Agent Match

Estado em 2026-10-24: **preparada, não executada e não aprovada para publicação**. O proprietário autorizou explicitamente até US$ 5 no total para as 72 gerações Lovable AI. A autorização abrange inferência; o agente construtor não deve ser usado. Não solicitar novamente essa mesma autorização.

## Evidência atual

O catálogo foi lido pela integração SQL nativa, apenas com metadados de pacotes publicados/aprovados: 665 entradas (512 skills, 52 guardrails, 32 playbooks, 69 souls). O snapshot está em `artifacts/agent-match-paired/catalog.json`; não contém briefs de clientes ou credenciais.

O plano congelado está em `artifacts/agent-match-paired/run-prepare-v1/plan.json`, SHA-256 `69e20f1d037be5934c57e44dfe8f44a9122a3e870057797bb19957c18e9ab81b`. São os oito briefs sintéticos originais mais quatro casos compostos, incluindo fonte com instrução maliciosa. Há três repetições por caso e por fluxo, com ordem alternada: 72 gerações. O teto de chamadas Jev é 612, incluindo os fallbacks de catálogo completo; não é uma estimativa de consumo efetivamente realizado. O preparador sai com código 4 para sinalizar evidência incompleta, nunca aprovação.

```sh
node --experimental-strip-types scripts/prepare-agent-match-comparison.ts \
  artifacts/agent-match-paired/catalog.json artifacts/agent-match-paired/NEW_RUN
```

O preparador rejeita diretório existente, catálogo vazio, slugs repetidos e fixtures necessárias ausentes. Preserva briefs, critérios, snapshot e hashes de fontes; uma correção de implementação exige nova rodada e manutenção dos históricos anteriores.

## Comparação exigida

Ambos os fluxos devem usar o mesmo gerador efetivo e configurações, o mesmo catálogo e os mesmos briefs. `buildMatchPrompt`, `MatchSchema` e `sanitizeMatch` em `src/lib/match/match-contract.ts` são compartilhados com o endpoint real. O braço Jev executa o adaptador de produção; o baseline não chama Jev. Não simular os resultados generativos e não usar o piloto 8/8 como aprovação de kits finais.

Registrar outputs brutos, hashes, modelo solicitado/efetivo, finish reason, entrada total, entrada cacheada, saída, erros, tempo do fluxo completo e custo de cada chamada. Ausência de metering ou falha deixa a comparação incompleta, sem interpretar custo desconhecido como zero. O preço de tabela calculado com tokens não é automaticamente igual aos créditos efetivamente deduzidos pelo Lovable.

A decisão em `src/lib/match/paired-evaluation.ts` exige:

- 12 casos completos, três repetições e os dois braços; nenhuma remoção de casos ou duplicação de observações.
- Mesma identidade do gerador dentro de cada par.
- Revisão primária, vinculada ao hash de cada output, de adequação à tarefa, fundamentação dos papéis, honestidade sobre lacunas, escopo/segurança, idioma e suporte no catálogo. Todas as dimensões devem passar, sem falhas altas/críticas; economia não compensa perda de qualidade.
- Custo total do braço Jev estritamente menor, incluindo Jev, geração e fallbacks.
- p95 do tempo total sem regressão. Com amostra pequena, isso continua sendo um gate conservador do experimento, não SLA de produção.

Os gates de publicação, compatibilidade de modelos e critérios adversariais das 21 skills permanecem intactos. A promoção do filtro não pode ser feita só por alterar uma variável de ambiente antes da comparação aprovada.

## Falhas técnicas corrigidas antes do lote

O código original filtrava slugs/tipos, mas não aplicava completamente suas próprias regras. Os testes reproduziram as falhas antes das correções:

1. Itens com score abaixo de 5 eram mantidos. Agora são descartados.
2. Slugs duplicados consumiam as vagas do kit. Agora são deduplicados antes do limite.
3. `pairs_with` de MCPs podia referenciar slugs inexistentes ou removidos do kit. Agora preserva apenas slugs do kit sanitizado, deduplica referências e descarta MCPs sem pareamento válido; mantém os checks de registro, nota mínima 6, unicidade e limite de quatro MCPs.

As mesmas regras corrigidas são usadas nos dois braços. A validação local passou nas 11 verificações e 248 testes. Isso é validação de implementação e do decisor pareado com fixtures determinísticas, não resultado da comparação de inferência.

## Lovable AI e consumo

A documentação atual informa que chamadas das funcionalidades de IA do aplicativo usam AI gateway/Run credits. A cobrança pode consumir a concessão mensal de IA e depois o saldo geral. Não há base para prometer zero créditos ao executar o lote via Lovable AI.

Fontes oficiais verificadas em 2026-10-24:

- [Uso e cobrança de AI gateway](https://docs.lovable.dev/features/ai#usage-and-pricing).
- [Uso e custo do projeto](https://docs.lovable.dev/features/project-usage).
- [Saldo unificado](https://lovable.dev/en/blog/simplifying-billing).
- [GPT-5.2 na OpenAI: preços e identidade](https://developers.openai.com/api/docs/models/gpt-5.2).
- [Modelos depreciados no gateway Lovable](https://docs.lovable.dev/features/ai-deprecated-models): GPT-5.2 está listado sem data de aposentadoria anunciada. Registrar o modelo efetivo impede confundir eventual roteamento para outro modelo com uma comparação de mesmo gerador.

Nenhuma inferência Lovable foi executada nesta etapa. Não houve ativação do filtro nem publicação. A chave gerenciada do aplicativo não deve ser extraída ou exposta para realizar o experimento; o caminho autenticado e o limite de gasto devem ser definidos antes do lote.

## Rodada real de seleção e correção de cobertura (2026-10-24)

As duas rodadas executaram o adaptador real sobre os 665 metadados públicos, 12 briefs e três repetições. Cada rodada completou 612 chamadas TypeSafe com o modelo efetivo `jev-1.14.0`, 4.904.367 tokens de entrada e 427.248 de saída. O equivalente pela tabela TypeSafe é US$ 0,205983414 por rodada (saída gratuita); isso não representa uma fatura reconciliada. São chamadas TypeSafe, não consumo Lovable AI.

| Protocolo      | Catálogo completo | Média encaminhada | p95 de seleção local | Slugs obrigatórios omitidos |
| -------------- | ----------------- | ----------------- | -------------------- | --------------------------- |
| v3, preservado | 32/36             | 622,86/665        | 1.251 ms             | 0                           |
| v4, corrigido  | 6/36              | 328,39/665        | 1.253 ms             | 0                           |

O v3 restaurava todos os tipos quando apenas um não atingia a cobertura mínima. O v4 restaura **todos** os candidatos do tipo insuficiente, incluindo os de probabilidade baixa; mantém a ordem original e preserva todos os candidatos ambíguos dos demais tipos. A exigência de ao menos uma nota >=0,8, o corte conservador >0,1, os mínimos por tipo e as duas alternativas continuam iguais. Ausência de correspondência confiante ou falha de transporte continua devolvendo o catálogo inteiro. Os seis casos de catálogo completo no v4 são as duas capacidades ausentes, em três repetições. A média caiu 50,6% em relação ao catálogo original; isso mede quantidade de metadados, **não** economia generativa comprovada.

O novo plano está em `artifacts/agent-match-paired/run-prepare-v2/plan.json`, hash `f498ccf75aa603842123013543aba73a885fd07383068a1fc944aeac0dae7bbf`. Casos, expectativas e critérios são idênticos ao plano v1. As seleções reais e seus relatórios estão em `run-live-v1` e `run-live-v2`; somente a segunda rodada pode ser associada ao seletor v4.

Automação explícita, com credencial TypeSafe configurada de forma privada:

```sh
node --experimental-strip-types scripts/prepare-agent-match-live.ts PLAN NEW_EXISTING_DIR --live
node --experimental-strip-types scripts/summarize-agent-match-selection.ts SELECTIONS PLAN NEW_REPORT
```

O primeiro comando rejeita evidência existente, grava tentativa antes da chamada e para se houver uso desconhecido. Retém request sintético/response sem headers ou credenciais. O segundo rejeita rodadas vazias, incompletas, duplicadas, de modelo divergente ou de plano diferente. Nenhum desses comandos gera kits ou aprova publicação.

O executor temporário `/admin/match-benchmark` exige autenticação e papel admin no servidor e aceita somente o hostname de preview gerenciado. A chave Lovable permanece no backend. O gerador é fixo em `openai/gpt-5.2`, sem fallback/retry, com limite de 4.096 tokens de saída e prazo de 180 segundos, idênticos nos dois braços; truncamento reprova. Um journal local é gravado antes de cada chamada, e uma tentativa incerta bloqueia retomada. Há um checkpoint explícito por observação para conferir créditos efetivos; o custo por tokens é identificado como equivalente do provedor, não cobrança Lovable. Não apagar o journal para repetir uma tentativa.

O workspace foi confirmado como Pro pela integração nativa. A [documentação de conversão](https://docs.lovable.dev/introduction/credits-and-usage#faq) informa US$ 0,25/crédito Pro. Conferir os créditos reais de cada observação no painel AI e manter a soma dentro de 20 créditos (US$ 5), sem somar consumo anterior alheio ao experimento. Nunca alterar o teto global do projeto para realizar o teste. A reserva por chamada usa limite conservador de bytes de entrada mais framing e teto de saída; uso desconhecido permanece bloqueado para reconciliação. A medição Jev é local e a geração é no preview; a soma dos estágios deve ser rotulada como tal, sem alegação de SLA medido em produção.
