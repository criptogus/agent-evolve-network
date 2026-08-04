# Verificar (e consertar) o fluxo de pagamento/assinatura

## O que eu já verifiquei agora

- **Go-live do Stripe: 100% completo.** Todos os 5 passos aprovados; contas sandbox e live existem.
- **Tokens de pagamento OK:** preview usa `pk_test_`, produção usa `pk_live_`.
- **Checkout está ligado na UI:** `/pricing` e `/account/billing` chamam o preço `agent_pass_pro_monthly` via checkout embutido.
- **Mas o caminho nunca foi provado de ponta a ponta:** existe **1 única** assinatura no banco (a sua, criada manualmente no ambiente live) e a tabela de eventos de pagamento está **vazia (0 registros)** — ou seja, nenhum webhook de pagamento real foi processado até hoje.

## Problemas concretos encontrados no código

1. **Erro do Stripe fica escondido.** O checkout não captura falhas da API do Stripe, então qualquer erro chega ao usuário como um 500 genérico — exatamente o sintoma de "página de compra fora do ar" que já apareceu antes.
2. **Modo do checkout fora do padrão** (`embedded` em vez de `embedded_page`), o que pode falhar após atualizações da API.
3. **Ambiente cai para "live" por engano.** Se o token de pagamento faltar em um build, o app assume produção em silêncio e o erro aparece só no servidor.
4. **Imposto não é calculado nem coletado** em nenhuma cobrança.
5. **Webhook incompleto:** só trata criação/atualização/cancelamento de assinatura. Não trata conclusão de checkout, pagamentos com liquidação atrasada, falha de fatura, nem registra nada na tabela de eventos (por isso ela está vazia e não há histórico auditável).

## O que vou fazer

### 1. Endurecer o checkout
- Capturar erros do Stripe e devolvê-los com a mensagem real (fim do 500 genérico), exibindo o motivo na tela.
- Trocar o modo do checkout para o padrão suportado.
- Falhar de forma explícita quando o token de pagamento não existir, em vez de assumir produção.
- Adicionar tratamento de imposto: Stripe calculando, coletando, declarando e recolhendo para compradores em ~80 países (+3,5% por transação), com cálculo/coleta simples como alternativa nos demais. O extrato do comprador aparece como `LINK.COM* SuperAgentSkill`.

### 2. Completar o webhook
- Tratar conclusão de checkout, pagamentos de liquidação atrasada (sucesso e falha), fatura paga e falha de pagamento.
- Registrar todo evento recebido na tabela de eventos de pagamento (com deduplicação), criando histórico auditável.
- Manter o registro da assinatura sempre sincronizado com o status do Stripe.

### 3. Página de diagnóstico de pagamentos (admin)
Nova aba `/admin/payments-health` que responde em uma tela, para os dois ambientes:
- o preço `agent_pass_pro_monthly` existe e qual valor/moeda;
- as chaves e os segredos de webhook estão presentes;
- quantos eventos de webhook chegaram nas últimas 24h/7d/30d;
- assinaturas por status, e alerta de assinatura sem `stripe_customer_id` (caso da linha criada manualmente);
- botão para criar uma sessão de teste e confirmar que o Stripe responde.

### 4. Teste real de ponta a ponta (com você)
Depois das correções, rodo o roteiro no preview (ambiente de teste, dinheiro nenhum é movimentado):
1. criar conta nova de teste → `/pricing` → assinar com o cartão `4242 4242 4242 4242`;
2. conferir que a assinatura aparece em `/account/billing` e que o webhook gravou o evento;
3. testar cartão recusado (`4000 0000 0000 0002`) e confirmar que a mensagem de erro aparece na tela;
4. abrir o portal de cobrança e cancelar, conferindo que o acesso segue até o fim do período;
5. repetir o passo 1 em produção com um valor real seu, se você quiser a confirmação final em live.

Eu executo os passos automatizáveis e reporto o resultado; a digitação do cartão no formulário do Stripe é a única parte que preciso que você faça (ou que eu faça via navegador automatizado, se preferir).

## Detalhes técnicos

- `src/lib/payments.functions.ts`: `try/catch` + `getStripeErrorMessage`, retorno `{ clientSecret } | { error }`, `ui_mode: "embedded_page"`, `managed_payments`/`automatic_tax`, `payment_intent_data.description` em cobranças únicas.
- `src/components/StripeEmbeddedCheckout.tsx`: tratar o retorno `{ error }` e renderizar a mensagem.
- `src/lib/stripe.ts`: derivar ambiente do prefixo do token e lançar erro quando ausente/desconhecido.
- `src/routes/api/public/payments/webhook.ts`: novos casos de evento + gravação idempotente em `payment_events`.
- Migração: índice único em `payment_events` por id de evento do Stripe (idempotência) — sem alterar dados existentes.
- Novos arquivos: `src/lib/admin/payments-health.functions.ts` (com middleware de admin) e `src/routes/admin.payments-health.tsx`, mais o link no menu admin.
