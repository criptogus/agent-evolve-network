# Programa de Referral + Mais Canais de Viralização

## Objetivo
Transformar cada usuário em um divulgador. Toda URL compartilhada do marketplace (skill, pack, soul, playbook, guardrail) carrega um **código de referral**. Quando alguém novo se cadastra por esse link e vira assinante pago, o divulgador ganha créditos no marketplace.

## 1. Modelo de dados (migrations)

**`profiles.referral_code`** (text, unique) — código curto (8 chars base32), gerado automaticamente no signup via trigger.

**`referrals`** — eventos de atribuição:
- `id`, `referrer_id` (uuid), `referred_user_id` (uuid, unique), `code` (text), `landed_at`, `signed_up_at`, `subscribed_at` (nullable), `first_purchase_at` (nullable), `status` (`pending` | `signed_up` | `subscribed` | `rewarded`), `source_url` (text), `package_slug` (nullable).

**`referral_rewards`** — recompensas pagas (auditoria, idempotência):
- `id`, `referral_id` (unique por tipo), `referrer_id`, `kind` (`signup` | `subscription` | `purchase`), `credits`, `ledger_entry_id`, `created_at`.

**RPC `award_referral_credits(_referral_id uuid, _kind text, _credits int)`** — security definer; insere em `credit_ledger` (motivo `promo`, ref_type `referral`) **e** `referral_rewards` numa transação. Idempotente via unique `(referral_id, kind)`.

**Regras de recompensa (configuráveis em `plans` ou constantes server):**
- Signup do indicado: **+20 créditos** ao referrer.
- Indicado vira assinante pago: **+200 créditos** ao referrer + **+50 bônus** ao indicado.
- Cada compra do indicado nos primeiros 90 dias: **5%** dos créditos pagos vão ao referrer.

Anti-fraude básico: mesmo IP/device do referrer não credita; auto-referral bloqueado; cap mensal de 5.000 créditos por referrer.

## 2. Captura do código (`?ref=CODE`)

- Componente `ReferralCapture` montado em `__root.tsx`: lê `?ref=` da URL, grava em cookie `sas_ref` (90 dias) **e** localStorage. Não sobrescreve se já houver.
- No fluxo de signup (`/signup`, OAuth callback): após criar o user, chamar server fn `claimReferral({ code })` que cria a linha em `referrals` com `referrer_id` resolvido pelo código (rejeita auto-referral / já existente).
- Webhook do Stripe (`api/public/payments/webhook.ts`): ao confirmar primeira assinatura ativa, busca `referrals` desse user e dispara `award_referral_credits` (kind=subscription). Idem em `purchase_package` RPC para a recompensa por compra.

## 3. URLs com referral

- Helper `buildShareUrl(path, user)` → adiciona `?ref={code}` se houver user logado.
- Atualizar `ShareOnXButton` para usar esse helper.
- Atualizar `getSharePromo` para receber a URL já com `ref`.

## 4. Mais canais de compartilhamento

Componente novo `ShareMenu` (dropdown) substituindo o botão único nas páginas: `/marketplace`, `/marketplace/$packageId`, `/packs/$slug`, `/souls/$slug`.

Canais:
- **X (Twitter)** — já existe, manter.
- **LinkedIn** — `linkedin.com/sharing/share-offsite/?url=...`.
- **Reddit** — `reddit.com/submit?url=...&title=...`.
- **WhatsApp** — `wa.me/?text=...` (mobile-first).
- **Copy link** — copia URL com `?ref=` + toast.
- **Embed badge** — modal com snippet HTML (`<a><img src="/api/public/badge/{slug}.svg?ref=CODE" /></a>`) — gera SVG dinâmico server-side (rota `/api/public/badge/$slug.svg`) com nome + estrelas + "Get on SuperAgentSkill".
- **QR code** — modal com QR (lib `qrcode`) da URL com ref, baixável como PNG. Útil para slides/eventos.

Cada canal usa o mesmo `getSharePromo` para texto AI, cacheado por `(slug, channel)`.

## 5. Página `/account/referrals`

Nova rota mostrando:
- Link pessoal (`https://superagentskill.com/?ref=CODE`) com botão copy.
- Stats: cliques, signups, assinantes convertidos, créditos ganhos.
- Tabela `referrals` do usuário (status + data).
- Leaderboard mensal top-10 referrers (público, opt-in via flag em `profiles`).

Adicionar card no `/account/credits` com resumo + CTA "Convide e ganhe".

## 6. Tracking de cliques

Rota `/api/public/r/$code` que: registra clique (tabela `referral_clicks` simples: code, ts, ua_hash, ip_hash, target), seta cookie e redireciona para `?ref=CODE` na URL alvo (passada via `?to=`). `ShareMenu` usa essa rota como wrapper opcional para canais onde queremos contar cliques sem JS no destino.

## 7. SEO/OG

`ShareMenu` mantém `og:image` por item (já existe). Embed badge SVG inclui `Cache-Control: public, max-age=300`.

---

## Detalhes técnicos

**Arquivos novos:**
- `supabase/migrations/<ts>_referrals.sql` — tabelas, trigger de `referral_code`, RPC.
- `src/lib/referrals/referrals.functions.ts` — `claimReferral`, `getMyReferralStats`, `getReferralLeaderboard`.
- `src/lib/referrals/capture.ts` — leitura de `?ref` + cookie/localStorage.
- `src/components/referrals/ReferralCapture.tsx` — montado em `__root.tsx`.
- `src/components/share/ShareMenu.tsx` — dropdown multi-canal, com QR e embed.
- `src/components/share/ShareBadgeModal.tsx`, `ShareQrModal.tsx`.
- `src/routes/account.referrals.tsx`.
- `src/routes/api/public/r.$code.ts` — tracker + redirect.
- `src/routes/api/public/badge.$slug[.]svg.ts` — SVG dinâmico.

**Arquivos editados:**
- `src/routes/__root.tsx` — montar `ReferralCapture`.
- `src/routes/signup.tsx` + OAuth callback — chamar `claimReferral`.
- `src/routes/api/public/payments/webhook.ts` — disparar reward em `subscription`.
- `src/lib/credits/credits.functions.ts` (`purchasePackage`) — após compra, conferir referral ativo e dar 5%.
- `src/lib/share/share-promo.functions.ts` — aceitar `channel`, ajustar prompt por canal.
- `src/components/share/ShareOnXButton.tsx` — virar wrapper de `ShareMenu` ou ser substituído nas 4 páginas que o usam.
- `src/components/site/Nav.tsx` ou `account.*` — adicionar link "Referrals".
- `package.json` — adicionar `qrcode`.

**Anti-fraude:**
- Hash de IP via crypto (não armazenar plain).
- Bloqueio: `referrer_id != referred_user_id`; mesmo `ip_hash` nas últimas 24h reduz peso pra 0.
- Cap mensal aplicado no RPC `award_referral_credits`.

**Idempotência:** unique `(referral_id, kind)` em `referral_rewards` impede dupla recompensa em retries de webhook.

## Fora de escopo (deixar para depois)
- Tier system (bronze/silver/gold).
- Pagamento em dinheiro (apenas créditos por enquanto).
- Notificações por email ao referrer (pode entrar numa V2 com Resend).
