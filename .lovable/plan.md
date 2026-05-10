## Páginas legais para destravar o Paddle (Privacy, Terms, Refund)

Paddle bloqueou o go-live por falta dos três documentos obrigatórios. Vou criar as três rotas, linkar no footer e adaptar o conteúdo ao produto (registry + MCP server + IA generativa).

### 1. Rotas novas (TanStack Start, file-based)

- `src/routes/privacy.tsx` — `/privacy`
- `src/routes/terms.tsx` — `/terms`
- `src/routes/refunds.tsx` — `/refunds`

Cada rota com `head()` próprio (title + description + og:title + og:description), layout consistente com `Nav` + `Footer`, conteúdo em prosa legível (sem componentes pesados).

### 2. Conteúdo (cobre os "must have" do Paddle)

**Terms & Conditions** (`/terms`)
- Nome legal do vendedor (a fornecer).
- Aceitação por uso continuado.
- Descrição do serviço: registry + MCP server de skills/playbooks/souls/guardrails para agentes de IA.
- Misuse: ilegal, fraude/spam, infração de IP, scraping, malware, jailbreak.
- Propriedade intelectual do serviço pela vendedora; licença limitada de uso.
- Sem garantia de uptime/erro-zero.
- Pagamento e assinaturas: remete a Paddle Buyer Terms (https://www.paddle.com/legal/checkout-buyer-terms).
- **Disclosure Paddle MoR** (texto exigido): "Our order process is conducted by our online reseller Paddle.com…".
- Suspensão/término por violação, fraude, não pagamento.
- **Cláusulas obrigatórias por categoria (GenAI)**: uso aceitável/proibido, responsabilidade do usuário por prompts/outputs/direitos sobre inputs, IP de inputs/outputs + takedown, moderação de conteúdo, disclaimer de precisão (não substitui aconselhamento profissional regulado).
- Boas-práticas: credenciais, accuracy, warranties disclaimer, restrições, user content licence, cap de responsabilidade (12 meses de fees), exclusão de danos indiretos, indenização do usuário, governing law, força maior.

**Privacy Notice** (`/privacy`)
- Nome legal + papel como controller.
- Categorias coletadas: nome, email, credenciais, conteúdo de pacotes enviados, tokens MCP (hash), telemetria de runs, logs, IP.
- Finalidades + base legal (contrato, legítimo interesse, consentimento quando aplicável).
- Compartilhamento: provedores de hosting/infra (Lovable Cloud), Paddle como MoR, autoridades quando exigido por lei.
- Retenção e exclusão.
- Direitos do usuário (acesso, correção, exclusão, portabilidade, objeção; menção GDPR/UK para usuários EEA).
- Segurança (criptografia em trânsito, hash de tokens, RLS).
- Cookies essenciais (sessão de auth) — sem cookies de marketing por padrão.
- Transferências internacionais com SCCs/adequacy.

**Refund Policy** (`/refunds`)
- Janela de 30 dias money-back.
- Como solicitar: paddle.net + suporte do vendedor.
- Sem "all sales are final".

### 3. Linkagem

Editar `src/components/site/Footer.tsx` para adicionar uma coluna "Legal" com `Privacy`, `Terms`, `Refunds` apontando para as três rotas (usando `<Link>` do TanStack Router).

### 4. Verificação

Após editar, esperar o build automático e confirmar no preview que `/privacy`, `/terms`, `/refunds` carregam e os links do footer funcionam. Em seguida, sugerir ao usuário rodar **Re-run check** no Payments dashboard.

### 5. O que NÃO está no escopo

- Nenhuma mudança em código de pagamento, billing ou webhook.
- Sem mudanças de schema.
- Sem alterações em UI fora do footer + 3 rotas novas.

### Pré-requisito antes de implementar

Você me passa o **nome legal do vendedor** (e jurisdição/país, se quiser que eu use no governing law). Sem isso, deixo um placeholder `[LEGAL ENTITY NAME]` no texto e você substitui depois — mas o Paddle pode reprovar se ficar literal.
