# Jev / TypeSafe: capacidades verificadas para o Super Agent Skill

Verificado em 2026-10-24. Pesquisa documental, sem alterações na integração ou produção. Fontes oficiais obtidas por Agent Reach / Jina Reader. Os resultados dos cookbooks abaixo pertencem ao fornecedor e não constituem uma medição deste projeto.

## Conclusão

Faz sentido avaliar Jev como seletor e reranqueador de capacidades antes de enviar contexto a um modelo generativo. O ganho depende de substituir leituras/chamadas existentes ou reduzir o contexto posterior; acrescentá-lo a toda operação aumenta custo e latência. A integração deve começar em modo de observação, com orçamento finito, mantendo o caminho atual como comparação e fallback. Esta é uma recomendação de arquitetura inferida das capacidades documentadas, não uma comprovação de economia no projeto.

## Contrato, versão e custo

A documentação lista `jev-1.14.0`, lançado em 14/10/2026, e `jev-1.13.0`. `jev-latest` e `jev-preview` apontam atualmente para 1.14.0; os aliases podem mudar. Fixar o ID e registrar o modelo efetivo é necessário quando se calibram limiares. O preço publicado é **US$ 0,042 por milhão de tokens de entrada**, com saída gratuita. Contexto padrão: 64k para estado e todas as perguntas; 32k para estado e qualquer pergunta individual. Não há teto separado de perguntas desde que ambos os contextos caibam. O estado é processado uma vez para perguntas paralelas. O modo experimental de contexto longo aumenta os dois limites para 262k e o próprio fornecedor relata perda de velocidade e acurácia. Inglês é a língua de melhor desempenho; português exige avaliação própria. [Models](https://docs.typesafe.ai/models.md)

Exemplo aritmético, não cotação de uma chamada: 10.000 tokens de entrada custariam US$ 0,00042; 100.000 chamadas desse tamanho somariam US$ 42. O total real deve incluir perguntas, candidatos e tentativas cobradas, além do modelo posterior. Esse cálculo não estima o volume de uso da plataforma.

A API usa `POST /v1/systemone`, recebe `state` e perguntas tipadas, permite tipos diferentes na mesma requisição e retorna modelo efetivo e consumo. `Choice` seleciona entre candidatos enumerados; `Noul` fornece probabilidade de uma condição; `Score` avalia níveis descritos. Não é necessário pedir geração livre e depois reparar JSON para essas decisões. [System One API](https://docs.typesafe.ai/api/system-one.md), [Primitives](https://docs.typesafe.ai/primitives.md)

Limites de tráfego são por organização, com tokens/segundo e requisições/segundo na conta. `429` e `529` requerem backoff; o corpo tem limite de 32 MiB e aninhamento de 64 níveis. Aplicar também limites locais de candidatos, tempo e tentativas; o tamanho HTTP aceito não é orçamento seguro de contexto. [Request rules and errors](https://docs.typesafe.ai/api/errors.md), [Models](https://docs.typesafe.ai/models.md)

## Evidência relevante à seleção de skills

O cookbook oficial usa dois estágios para 182 skills: uma leitura de índices resumidos e uma rechecagem detalhada dos três melhores candidatos, admitindo que nenhuma skill se aplique. No experimento publicado, carregamentos errados caíram de 16,8% para 7,3% e carregamentos desnecessários de 9,8% para 4,0%. O fornecedor também relata casos antes corretos que se tornam errados quando a sugestão é anexada. Isso apoia um piloto comparativo, não ativação irrestrita. [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md)

Outro cookbook usa busca BM25 para recuperar candidatos antes de aplicar Jev a 30 passagens por consulta. No recorte CLERC publicado, top-1 passou de 5% para 18%, e top-10 de 38% para 62%; 1.200 chamadas consumiram 1.536.002 tokens de entrada e custaram US$ 0,0645. A consequência prática é recuperar primeiro e reranquear depois. Não enviar todo o catálogo em todas as consultas, nem transferir esses percentuais para o catálogo deste projeto. [Re-ranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md)

Em um exemplo com o mesmo documento e 13 perguntas independentes, o fornecedor reporta 0,27 s em lote versus 2,71 s em chamadas sequenciais, e custo US$ 0,000497 versus US$ 0,006090. O exemplo usa `jev-1.12`; é evidência do benefício de compartilhar estado, **não um SLA nem previsão de latência para 1.14 ou para este projeto**. Nenhum SLA de p95 foi verificado nesta pesquisa. [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions.md)

## Confiança, segurança e aprovação

`confidence` em Choice/Score resume a concentração da distribuição; não é uma prova independente de acerto. Noul retorna probabilidade e não uma confiança separada. O limiar depende das consequências e deve ser calibrado com exemplos representativos, incluindo português, entradas ambíguas e nenhum candidato adequado. Não adotar o mesmo limiar para recomendar uma skill e aprovar sua publicação. [Confidence](https://docs.typesafe.ai/confidence.md)

As limitações publicadas para **1.13** incluem precisão numérica, datas, indireção, distrações em contexto longo, ordem de opções e conteúdo adversarial que influencia a resposta. A página não comprova que todos esses problemas persistem em 1.14 nem que foram resolvidos. O piloto de 1.14 deve incluí-los. Cálculos, autorização, compatibilidade, assinaturas, versões e publicação permanecem em código/gates existentes; Jev pode priorizar revisão, mas não dispensar casos adversariais obrigatórios. [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)

## Dados e privacidade

A política afirma que o fornecedor não treina nem ajusta modelos com os inputs. Isso **não equivale a retenção zero**: a política mantém dados enquanto razoavelmente necessários e informa hospedagem nos EUA. O DPA também usa necessidade da finalidade e legislação como critérios de retenção, sem um prazo fixo universal em dias. A documentação oferece ZDR para clientes enterprise, mediante contato comercial. Começar com metadados públicos e consultas sintéticas; conteúdo privado de equipes, CRM ou segredos exige a avaliação de tratamento e contrato apropriada antes de envio. [Privacy policy](https://typesafe.ai/legal/privacy-policy), [DPA](https://typesafe.ai/legal/data-processing), [Legal](https://docs.typesafe.ai/legal.md)

## Proposta de piloto e critérios de decisão

1. Usar busca/filtros determinísticos atuais para produzir candidatos publicados e compatíveis; passar a Jev somente consulta e metadados necessários. Uma escolha explícita do usuário continua prevalecendo.
2. Reranquear a shortlist com perguntas de relevância e possibilidade de nenhuma opção. Carregar o conteúdo integral só dos finalistas antes de chamar o modelo generativo.
3. Executar em modo de observação sobre um conjunto rotulado e congelado, comparando com o caminho atual: acerto top-k, recall, falsos descartes, abstention e qualidade da tarefa final. Adicionar ataques no texto da consulta e descrições, opções embaralhadas, duplicatas e português.
4. Medir tokens e custo **de todo o fluxo**, chamadas evitadas, taxa de fallback, erros/429, latência p50/p95 e acerto final. Economizar input do modelo principal não implica economizar tokens totais ou melhorar qualidade.
5. Só promover se houver ganho medido sem degradar os critérios de qualidade estabelecidos. Cache deve incluir hash da consulta, candidatos/versões, pergunta, modelo e escopo de tenant quando aplicável; uma entrada antiga não autoriza usar uma skill revogada ou incompatível.

Os itens desta seção são recomendações de desenho e avaliação; nenhuma economia, qualidade ou latência do Super Agent Skill foi medida por este levantamento documental.
