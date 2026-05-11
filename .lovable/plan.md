## Objetivo

Elevar o site inteiro com foco em desenvolvedores que conectam agentes via MCP. CTA primário consistente: **"Connect your agent"**. Tom mais direto, benefício-primeiro, mantendo a estética atual (Stripe/Linear, vermelho, grade).

## 1. Copy & CRO (benefício-primeiro, dev-céntrico)

**Hero (`/`)**
- H1: "Your AI agent, but actually good at the job." (rotativo permanece)
- Sub: começar com prova quantificada — ex.: *"30s para conectar. Um comando para virar especialista. Health Score sobe sozinho."*
- CTAs: primário `Connect your agent` (vai para `/connect`, não `#connect`), secundário `npm i -g superagentskill` com botão de copy inline (atrito zero para dev).
- Badge de prova: "MCP-native · works with Claude, Cursor, Codex, Grok" + microcopy "no SDK, no retraining".

**Trust bar**: trocar marquee de logos de runtimes por linha estática (mais credível, melhor LCP) + 3 métricas reais ou plausíveis ("4.2k+ skills", "98% health médio", "30s setup").

**Seções**
- Reescrever subtítulos para verbos de resultado ("Install", "Evolve", "Ship") em vez de descrição abstrata.
- `CTASection` final: dois CTAs claros — `Connect your agent` (primário) + `Browse the registry` (secundário).
- Adicionar mini "Quickstart" com bloco de código copiável acima do FAQ (alta intenção dev).

**Pricing (`/pricing`)**
- Headline focada em ROI: "Pay per agent. Keep 80–85% as creator."
- Adicionar comparação de features em tabela colapsável.
- FAQ curto (3 perguntas) anti-objeção: "Sem retraining?", "Funciona com meu runtime?", "Cancelo quando?".

**Outras rotas públicas** (`/connect`, `/docs`, `/marketplace`, `/discover`, `/forge`, `/community`, `/skillforge`, `/evaluation`, `/match`, `/packs`, `/pricing`, `/terms`, `/privacy`, `/refunds`):
- Cada uma ganha H1 único, intro de 1 frase com benefício, CTA secundário consistente apontando para `/connect`.

## 2. UI & micro-animações

- Padronizar entrada de seções com IntersectionObserver + `animate-fade-in` (uma vez, não em cada scroll). Hoje tudo entra com `fade-up` no mount.
- Hero: parallax suave no `hero-glow`, cursor blink no terminal, números do Health Score animando com count-up.
- Cards (`HowItWorks`, `CompareIndustries`): hover com leve elevação + borda primária (já parcial).
- Adicionar `prefers-reduced-motion` guards globais nas keyframes.
- Botões: variant `cta` no `buttonVariants` com gradient sutil + shadow-glow no hover.
- Footer: reorganizar em 4 colunas (Product / Creators / Company / Legal) com newsletter capture (email → Lovable Cloud table).

## 3. SEO

- Cada rota com `head()` único: title <60 chars, description <160, og:title, og:description, og:image (usar imagem da rota quando existir).
- Adicionar canonical link em todas via `links` no `head()`.
- JSON-LD na home: `Organization` + `SoftwareApplication`. Em `/marketplace/$packageId`: `Product` + `AggregateRating` quando houver reviews. Em `/pricing`: `Offer`.
- Garantir 1 H1 por rota; revisar hierarquia H2/H3.
- Adicionar `<link rel="alternate" hreflang>` para PT/EN se aplicável (apenas EN por ora; deixar estrutura pronta).
- Sitemap dinâmico em `src/routes/sitemap[.]xml.tsx` listando rotas estáticas + pacotes/souls publicados via loader.
- `robots.txt` confirmando sitemap.

## 4. GEO (AI/LLM search)

- Atualizar `/llms.txt` com seções: What it is, Who it's for, Key concepts (skills/playbooks/souls/guardrails), How to connect (curl/MCP snippet), Pricing, Links canônicos por rota.
- `/agents.md` com instruções estruturadas para agentes consumirem o produto (ja existe — auditar e expandir).
- Adicionar bloco "TL;DR" em cada rota pública (200–300 chars) que LLMs citam bem.
- FAQ com `FAQPage` JSON-LD (ótimo para AI Overviews/Perplexity).

## 5. Performance

- Hero: `McpInstallAnimation` e `Typewriter` → `lazy()` + Suspense fallback (são pesados e abaixo da dobra crítica para LCP).
- `marquee` de logos: trocar por SVG estático ou `content-visibility: auto`.
- Imagens (og, screenshots): garantir `loading="lazy"`, `decoding="async"`, dimensões explícitas.
- Fontes Inter/JetBrains Mono: `font-display: swap` + preconnect; subset latin only.
- Code splitting: rotas `admin.*` já são separadas pelo TanStack; verificar que não importam nada da landing.
- Remover `tw-animate-css` se subutilizado (já temos keyframes próprios) — economia de CSS.
- Audit com `browser--performance_profile` antes/depois e reportar Web Vitals.

## 6. Acessibilidade & polish

- Skip-link "Pular para conteúdo".
- Focus rings visíveis no tema (já existe `--ring`, validar contraste).
- Alt text em todas imagens; aria-labels em ícones-only buttons.
- Verificar contraste do `text-muted-foreground` em fundo `surface/40`.

## 7. Ordem de execução

1. **Copy & SEO global**: head() de cada rota, JSON-LD, sitemap, llms.txt.
2. **Hero/Home**: nova H1, CTAs, copy block, code-copy button, animations refinadas.
3. **Outras rotas públicas**: H1+intro+CTA secundário padronizado.
4. **Performance**: lazy load animações pesadas, fonts, marquee.
5. **Footer + newsletter** (Lovable Cloud table `newsletter_signups`).
6. **A11y pass + reduced-motion**.
7. **Audit final**: Lighthouse/perf profile + screenshot QA das rotas principais.

## Detalhes técnicos

- Novos arquivos: `src/routes/sitemap[.]xml.tsx`, `src/components/site/CopyButton.tsx`, `src/components/site/CountUp.tsx`, `src/components/site/SectionReveal.tsx`, `src/components/site/JsonLd.tsx`.
- Migration: `newsletter_signups (id, email unique, created_at)` com RLS `INSERT` aberto + `SELECT` admin-only.
- Sem mudanças em business logic, auth, billing ou edge functions.
- Nenhuma alteração em `routeTree.gen.ts`, `client.ts`, `types.ts`.

## Fora de escopo

- Redesign visual radical (paleta, tipografia, layout system).
- Novas features de produto (apenas marketing/landing/UX).
- i18n completo (apenas estrutura preparada).
