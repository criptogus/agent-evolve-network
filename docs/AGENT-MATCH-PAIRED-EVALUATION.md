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

### Falha real do gateway e nova rodada de geração

A primeira tentativa de geração do plano v2 foi rejeitada antes da inferência. O painel nativo AI registrou `Client error`, modelo `openai/gpt-5.2`, 0 tokens de entrada, 0 de saída e a mensagem: `'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.` O adaptador OpenAI-compatible usa JSON object quando o provedor não anuncia schema nativo; o prompt compartilhado não continha a palavra JSON nem a especificação completa da saída. A correção inclui o JSON Schema real no prompt de ambos os braços, além de instruções explícitas de idioma, fonte não confiável e escopo de ações. Um teste reproduz o contrato necessário. Nenhum output foi reparado ou aprovado.

O journal original está preservado em `run-live-v2/generator-attempt-001.json` e a conferência visual em `gateway-error-reconciliation.json`. O painel mostra um traço no campo de créditos; esse símbolo não é convertido em custo numérico zero. A reserva original de US$ 0,24430525 continua retida: o novo executor começa com no máximo US$ 4,75569475 disponíveis para todo o restante da autorização original, sem renovação do teto.

O plano v3 tem hash `62d4d92cb729da63d9adbdf2ea59f839afbe4a5350d0bd656642561842437641`. Mantém os mesmos 12 casos, três repetições, 72 gerações, expectativas e critérios. Como a seleção Jev não mudou, o novo lote referencia a evidência real v4 anterior por hash; não repete suas 612 chamadas nem altera seus arquivos. O comando `prepare-agent-match-live.ts NEW_PLAN NEW_EXISTING_DIR --reuse ORIGINAL_SELECTIONS ORIGINAL_PLAN` verifica os hashes dos dois planos, igualdade dos inputs/critérios/schedule e fontes exatas do seletor antes de produzir essa vinculação. Não reutilizar seleção se essas condições divergirem.

O plano v4 (`f7aace421dad1444728bddd934e95eb30197c8faf410b0d1f8748278c1c27828`) inclui também os fingerprints do perfil compartilhado de geração, do endpoint real e do resolvedor de gateway. `match-generation.ts` fornece o mesmo prazo, zero retries e `max_completion_tokens=4096` para o Agent Match e ambos os braços. O teste de transporte real do SDK, com resposta interceptada e sem inferência, verifica que o payload usa esse campo, omite `max_tokens` e inclui o schema JSON nas mensagens. A observação rejeitada original permanece separada; os planos v3/v4 preparados não apagam nem reclassificam a falha do v2. A vinculação do Jev real ao plano v4 foi executada com zero novas chamadas.

### Medição completa no backend gerenciado

A inspeção somente dos nomes de secrets confirmou a ausência de `TYPESAFE_API_KEY` no backend. Foi solicitada ao proprietário a configuração privada dessa credencial; nenhum valor de secret foi lido ou transferido. A etapa local não substitui a medição completa exigida para aprovação.

O executor agora realiza a seleção real pelo adaptador de produção dentro do mesmo backend que gera o kit. O baseline não faz chamadas Jev; o braço Jev exige sua credencial antes de reservar/iniciar a observação. Os dois recebem o mesmo catálogo congelado, e a reserva Lovable usa conservadoramente o prompt completo antes da seleção. Falha com uso Jev desconhecido impede iniciar o gerador e bloqueia a rodada. O resultado retém notas por lote, modelo/uso real, slugs efetivamente encaminhados, tempo do gerador, tempo total no servidor e ida/volta real do cliente. A medição local anterior permanece apenas diagnóstico/proveniência, sem substituir o tempo nem as notas medidos na rodada de qualificação.

O plano v5 (`44e6a4723ae7514a39baaa54e7b2fb56694387736a9a0349d2ff11103e6c5eae`) inclui fingerprints do executor e orçamento, além do contrato/perfil/adaptador de produção. Mantém os mesmos briefs, expectativas, critérios, catálogo e 72 gerações; as 36 novas seleções Jev da qualificação serão executadas no backend, com máximo 612 chamadas e sem retries. Preparação de arquivo não é inferência nem aprovação. O teto financeiro é o mesmo US$5 inicial, com a reserva anterior ainda retida.

### Entrega da resposta e preservação do orçamento

A primeira geração corrigida chegou ao gateway com sucesso: o painel nativo registrou 22.689 tokens de entrada, 1.537 de saída, 24,3 segundos e 0,24 crédito exibido. O RPC devolveu uma página de erro e o journal original permaneceu inflight, sem resultado. Essa geração **não** foi transformada em observação aprovada nem reutilizada como baseline completo. Os registros estão em `run-live-v5/generator-journal-001.json` e `gateway-billing-reconciliation.json`.

A causa reproduzida é o prazo de 20 segundos do handler em `src/server.ts`, anterior à conclusão do gerador. `tests/match-stream.test.ts` reproduziu o timeout com o mesmo padrão de await e um relógio reduzido; falhou antes da correção e passou com a resposta tipada por streaming. O limite global de 20 segundos continua intacto. O stream inicia imediatamente, mantém heartbeats, devolve somente o resultado completo e cancela/encerra trabalho pendente em prazo finito. O tempo do cliente continua medido até ler o resultado final, não até o primeiro heartbeat. Erros brutos/HTML não são exibidos pelo novo consumidor.

O probe privado `Test streaming transport (no inference)` aguarda 25 segundos e devolve 147.456 bytes sintéticos pelo mesmo caminho de transporte. Exige admin autenticado e hostname de preview; não chama modelos. Seu resultado real precisa ser observado no preview antes de repetir inferências pagas. Isso testa entrega e serialização, não qualidade de kits.

O plano v6 (`93374756c413f0b2a12ae2284df8b915e58ca7ead90de7407b8bddd2d4c55410`) acrescenta os fingerprints do servidor, prazo, stream e tela de produção. Inputs, modelo, repetições e critérios continuam congelados. O orçamento original não foi reiniciado: além da reserva antiga de US$0,24430525, o executor desconta US$0,06125 como teto conservador do crédito exibido da geração cujo RPC falhou. Restam no máximo US$4,69444475 para as próximas inferências, até conferir outros lançamentos. O campo de reconciliação da tela refere-se apenas à nova rodada; os custos anteriores já estão descontados separadamente.

Comando determinístico de decisão, sem inferência nem publicação:

```sh
node --experimental-strip-types scripts/evaluate-agent-match-comparison.ts \
  PLAN JOURNAL PRIMARY_REVIEWS NATIVE_BILLING NEW_REPORT
```

Esse adaptador preserva o decisor original e exige o hash do plano, fingerprints atuais das fontes, slugs obrigatórios, tempo completo, modelo/uso de seleção medidos no backend e revisões primárias. O custo usa o limite inferior do baseline e o superior do braço Jev para rejeitar economia que dependa do arredondamento da UI. Uso/cobrança ausentes permanecem nulos no relatório; coortes vazias, inflight, parciais ou sem revisões saem com código 4 e `approved:false`. A execução real contra o journal interrompido v5 foi rejeitada. Nenhuma permissão de publicação foi inferida desses testes.

### Regressão do serializer e prova no preview

O primeiro probe encontrou uma falha adicional de transporte, sem inferência: os logs nativos do preview registraram `ctx.parseStreamSource is not a function`. O lock combinava Seroval 1.6.8 e seroval-plugins 1.7.1. A reprodução com os plugins reais do framework foi adicionada a `tests/match-stream.test.ts` e falhou com a mesma exceção. Os dois pacotes foram fixados explicitamente em 1.7.2, a instalação congelada `npm ci` foi refeita e a mesma regressão passou. Nenhum teste foi removido nem critério abrandado.

O probe repetido na revisão `276dc7c3` passou: primeiro transporte em **670 ms**, resultado completo após **25.626 ms** no cliente, **25.000 ms** no servidor e **147.456 bytes**. Foram observados heartbeats em 670, 5.615, 10.614, 15.618 e 20.614 ms; o resultado chegou em 25.624 ms. Nenhum modelo foi chamado. O relatório está em `run-live-v6/native-transport-probe.json`. A instrumentação temporária foi removida após localizar e validar as falhas.

O plano v7 (`e3ebfd54fe6e4de958ed2f27cb95f1051ccc8e76b241b0a18791419a53ec2fcd`) inclui também package.json, além do lock e dos 15 arquivos anteriores. Mantém exatamente os inputs, expectativas, limiares e critérios dos planos anteriores. O orçamento continua o mesmo teto inicial de US$5 e desconta os custos/reservas anteriores. A prova de transporte não aprova a comparação de qualidade/custo nem altera a exigência de completar 72 observações reais e revisá-las por hash.

### Correção de grounding e primeira execução com o secret configurado

A resposta completa v7 foi rejeitada na revisão primária: o playbook de higiene trimestral de CRM foi reaproveitado como normalização de pedidos, fora do domínio documentado. A revisão por hash foi preservada, com `grounded_roles=false`, sem alterar os critérios. O contrato passou a explicitar que contagens são preferências e funções devem ser sustentadas pelos metadados, sem adaptação de domínio. O sanitizer também respeita contagens opcionais explicitamente zero; a regressão falhou antes e passou após a correção.

O plano v8 (`d8de6867034bda9860dfcb48b6cdc2ecb5dd12afe828045e082f57dbca7b88e9`) preserva catálogo, casos, critérios, contagens e schedule originais. As 11 verificações e 260 testes passaram. O proprietário configurou o secret; o preflight autenticado confirmou TypeSafe configurado, mantendo o modo de produção shadow.

O primeiro baseline corrigido retornou em 24.737 ms no cliente: GPT-5.2-2025-12-11, 22.792 tokens de entrada, 1.523 de saída. A revisão primária aprovou suas seis dimensões, sem playbook fora de domínio. O painel nativo registrou a solicitação 482 com 0,24 crédito exibido; intervalo conservador US$ 0,05875–0,06125. Isso não aprova a comparação.

O próximo braço Jev encerrou com `provider_error`: quatro solicitações, uso incompleto, nenhum gerador iniciado. O journal interrompido permanece imutável em `run-live-v8/browser-journal-002.json`. Sem repetição automática ou promoção. A instrumentação diagnóstica registra somente etapa e código HTTP, sem corpo do provedor, cabeçalhos ou credenciais; o teste administrativo finito usa um único candidato sintético e não chama Lovable AI.

O diagnóstico isolado identificou `redirect_rejected` no transporte gerenciado antes de uma resposta HTTP. `redirect: manual` preserva o destino fixo e a rejeição de todo 3xx, sem seguir redirecionamentos ou encaminhar o segredo; a regressão valida uma resposta 307 com uma única chamada. Na revisão 6613eb1d, a prova real passou: Jev 1.14.0, 467 tokens de entrada, 21 de saída, uso completo, 220 ms, nenhuma geração Lovable. As três provas estão em `run-live-v8/managed-typesafe-probe-00{1,2,3}.json`.

O plano v9 (`b6c1b01340b8804d31dd65baafba1c5ca2c840bd004be5f84a5d65e86854d1ce`) mantém os casos/critérios originais. A preparação `--managed-only` evita inferências locais redundantes que não participariam da qualificação. O orçamento desconta US$ 0,18875 de cobranças anteriores pelo limite superior e mantém US$ 0,49615825 de reservas desconhecidas, deixando no máximo US$ 4,31509175 do teto original. Essas reservas não são classificadas como custos faturados confirmados.

No v9 o baseline completou com entrada em cache e custo nativo de 0,10 crédito exibido. O Jev real completou 17 solicitações, 136.197 tokens de entrada, 11.868 de saída e 1.054 ms, encaminhando 232 dos 665 pacotes. O gerador seguinte retornou HTTP 200, mas o SDK rejeitou `gaps[1].capability` acima do limite de 160 caracteres. A resposta original permaneceu rejeitada e seu transporte integral foi preservado; não houve truncamento/reparo para aprovação. O painel nativo registrou 0,17 crédito para esse gerador. O par parcial também mostra que cache e custo de seleção precisam ser contabilizados: menos metadados não implica automaticamente menor custo ou latência.

A causa de contrato foi reproduzida no payload real do SDK: sem `supportsStructuredOutputs`, o provedor usava apenas `json_object`, sem transmitir o schema ao decodificador. O perfil compartilhado agora habilita `json_schema` estrito somente no Agent Match; os demais consumidores do gateway preservam o padrão anterior. A regressão verifica o schema estrito no payload e falhou ao identificar `recommended_mcps` opcional por default. Esse campo passa a ser explicitamente obrigatório (array vazio continua válido), tornando o contrato mais estrito; limites de tamanho, critérios semânticos e limiares permanecem. Não há reparo de saída nem relaxamento de schema.

O plano v10 (`dbf73ef607c43ba7d257eeae0b526f326921da0353e892b5048c0505d30f9da5`) incorpora essa correção e mantém todos os casos/critérios originais. O limite superior das cobranças anteriores é US$ 0,25875 e as reservas desconhecidas mantidas somam US$ 0,49615825; no máximo US$ 4,24509175 continuam disponíveis do teto inicial.

O v10 concluiu o primeiro par NF-e com ambos os braços aprovados na revisão primária; o caso Pix seguinte foi rejeitado por grounding. O pacote `verifying-evidence` exige evidências antes de declarar uma correção (logs/reprodução/testes), enquanto a recomendação o tratou como verificador de liquidação financeira. A revisão primária preservada marcou `grounded_roles=false`; o Jev consultado como apoio retornou 0,1 para suporte ao papel (494/23 tokens), sem substituir a decisão primária. O registro v10 não foi aprovado nem publicado.

O prompt v11 acrescenta a regra geral de preservar o sujeito e o resultado documentados de cada pacote; compartilhar verbos como verificar/auditar não amplia seu escopo. Não inclui slugs ou exemplos específicos dos casos. O executor admite até quatro observações por acionamento, mantendo a reserva integral de cada geração até conferir o lote no painel nativo. Antes de retomar exige a contagem reconciliada igual a todas as observações concluídas e gasto acumulado não decrescente. Isso não modifica o schedule de 72, o modelo, casos, limiares ou critérios. Nenhum lote recupera automaticamente erro, schema inválido ou tentativa em andamento. A revisão semântica continua primária e separada da execução.

O plano v11 (`bb791cc1b3a8d28c65fb9947d7a6bb1754b001e34296980ddfa4f3e769f243ad`) mantém os inputs originais. O limite superior das oito cobranças nativas anteriores soma US$ 0,41; as reservas mantidas continuam US$ 0,49615825. Disponível do teto original: no máximo US$ 4,09384175.

O v11 completou quatro observações reais e foi rejeitado por grounding: o baseline NF-e aplicou `verification-loop` (build/type/lint/test/security de mudanças de código) ao relatório financeiro; ambos os braços Pix reaproveitaram `verifying-evidence` para liquidação. O braço Jev NF-e colocou `pii-redactor` no tipo skill, removido corretamente pelo sanitizer, mas manteve sua proteção como parte do kit na narrativa. Todas as respostas, revisões primárias e quatro cobranças nativas estão em `run-live-v11/`; o relatório executado rejeita as quatro revisões e a coorte incompleta. Não se generalizam custo/p95 de apenas dois pares.

O v12 trata a falha de tipos na geração, sem remendar saídas: o schema compartilhado restringe os slugs aos candidatos do respectivo tipo, notas a pelo menos 5 e contagens aos limites originais do sanitizer. Um tipo vazio/desativado exige array vazio. O decoder estrito recebe esse schema no Agent Match real e em ambos os braços. A regressão rejeita slugs inexistentes, tipos trocados, notas insuficientes e excedentes antes da sanitização. O schema-base e os critérios de aprovação não são relaxados. O prompt distingue de forma geral o trabalho solicitado de desenvolver/validar o software que o implementaria, sem citar casos ou slugs de teste.

O plano v12 (`bb65012fa50678a5b216bf2725a160517553d1e77c5e35dd59572d9d09f401c3`) mantém casos, expectativas e critérios. Doze checkpoints nativos somam 2,41 créditos exibidos: limite superior conservador US$ 0,6175. As reservas anteriores mantêm US$ 0,49615825. Disponível no máximo US$ 3,88634175 do teto original de US$5.

O v12 completou quatro respostas válidas no schema por tipo, mas todas foram rejeitadas na revisão primária: continuaram atribuindo verificação de documentos/baixas financeiras a `verifying-evidence`; o baseline Pix também usou `verification-loop`. O baseline NF-e propôs um guardrail tributário que já existe no catálogo completo. O painel nativo registrou 495 solicitações; as quatro novas cobranças foram 0,27/0,15/0,17/0,25 créditos em ordem de execução. O relatório real v12 permanece reprovado. Não há generalização dos resultados de custo/p95 desse prefixo.

A próxima correção torna explícito `recommended_kit.work_domain` na saída bruta: `runtime_work` versus `software_work`. Ambos os braços usam a mesma união de schemas. A primeira opção não admite pacotes cuja própria descrição exige evidências antes de declarar uma correção ou gates de mudanças de código; a segunda preserva essas opções. A seleção do ramo é feita pelo gerador e deve corresponder ao brief na revisão primária — escolher o ramo errado continua sendo falha. Não há aprovação automática por essa classificação. Os ramos possuem literais distintos; `anyOf` preserva sua exclusividade lógica e é aceito pelo decoder estruturado. O teste do payload real do SDK exige `anyOf`, rejeitando `oneOf`. O schema completo segue no campo estruturado do provedor; removida sua cópia textual redundante do prompt, que continua exigindo JSON. Casos, catálogo original, expectativas, limiares, número de observações e regras de aprovação não mudam.

Foi identificado também um limite operacional antes do lote completo: o journal bruto cresce além da quota de localStorage. O novo executor usa IndexedDB com commit estrito e aguarda a gravação da tentativa antes de chamar o modelo. As evidências antigas em localStorage e arquivos permanecem intactas. A prova finita de journal grava e relê exatamente 6.684.672 caracteres sintéticos em uma chave separada, sem inferência; seu resultado real deve ser conferido antes do lote. A exportação pelo textarea precisa ler blocos de até 50.000 caracteres para evitar truncamento na interface de automação. Nunca interpretar um JSON truncado como evidência completa.

Os planos v13/v14 foram apenas preparados, sem inferências: v14 substitui `oneOf` por `anyOf` antes de qualquer chamada, e v15 inclui o fingerprint do journal durável. Plano v15: `8994558673e88d59618288f9d0ebd0c051087d1e2880c780af62fb7474601dba`. Dezesseis cobranças nativas anteriores somam 3,25 créditos exibidos: limite superior US$ 0,8325. As reservas anteriores permanecem US$ 0,49615825. Disponível no máximo US$ 3,67134175 do teto inicial; nenhum orçamento foi reiniciado.
