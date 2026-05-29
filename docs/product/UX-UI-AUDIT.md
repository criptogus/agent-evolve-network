# UX / UI Audit

> Scope: marketing site (home `src/routes/index.tsx` + shared `src/components/site/*`) and the broader app surface. Design system: Tailwind v4, OKLCH tokens in `src/styles.css` (light "Stripe/Twilio-grade" neutrals, pure power-red `--primary`, lime "signal" green), Inter + JetBrains Mono, shadcn/ui primitives in `src/components/ui/`. Overall the craft is high — strong tokens, dark mode, accessible primitives, good motion. The issues below are about **clarity, consistency, and conversion**, not polish.

---

## 1. Critical issues (fix first — credibility & trust)

### C1. Inconsistent package counts ⚠️
The headline number contradicts itself across the page:
- Hero badge + copy + stat: **459+** skills (`index.tsx:130,157,182,211`)
- HowItWorks step 03: **"4,200+ ready-made experts"** (`index.tsx:420`)
- Manifesto / FreeVsPremium: **"500+ / Hundreds"** (`index.tsx:2021,2045`)
- README: 76 in repo / 370+ hosted

A prospect who notices 459 → 4,200 → 500 in one scroll loses trust instantly. **Pick one source of truth** (ideally a build-time constant fed from the registry count) and use it everywhere.

### C2. "Trust Score" vs "Health Score" naming
The product's flagship metric is **Trust Score** everywhere except testimonial quotes that say **"Health Score"** (`index.tsx:1864`) and FreeVsPremium "guaranteed health scores" (`index.tsx:2054`). Same concept, two names = confusion. Standardize on **Trust Score**.

### C3. Fabricated-looking testimonials
`CASES`/`QUOTES` use named people and specific orgs ("Mayo-affiliated clinic", "Dr. Helena Vasquez", "fintech unicorn") that read as real customers (`index.tsx:1816–1880`). The SocialProof header does disclaim "illustrative scenarios" (`index.tsx:1894`), but the cards themselves don't — this is a legal/trust risk and undermines the very "proof not prompts" positioning. **Either** secure real, attributable testimonials **or** visibly label each card as illustrative and drop fake names/affiliations.

### C4. License mislabel
FreeVsPremium tags the open registry **"MIT-style"** (`index.tsx:2080`), but the repo is **Apache 2.0 (code) + CC BY-SA 4.0 (content)**. Small, but it's exactly the kind of inaccuracy a compliance buyer catches.

## 2. High-impact conversion issues

### H1. Message overload / too many sections
The home page renders **17 sections** before the footer (`index.tsx:97–113`), several overlapping in message (SkillLayerManifesto, WhatIsThis, CoreConcepts, FreeVsPremium, NetworkSection all re-explain "open registry + premium + evolves itself"). For conversion this is cognitive overload and dilutes the CTA. **Recommendation:** collapse to a tighter narrative — Hero → How it works (3 steps) → Proof/Trust → Use-cases → Pricing/CTA. Move the manifesto/network/eval-loop depth to a dedicated "How it works" or "Trust" page.

### H2. Jargon above the fold
Hero and the first content section lead with "adversarial harness", "Ed25519-signed", "severity-weighted", "blast-radius" — perfect for the security persona, **scary for the solo builder** who is the widest top-of-funnel. Lead with the **benefit** ("your AI becomes an expert in 30s, no code") and let the security proof live one scroll down for those who care.

### H3. Two competing primary CTAs
Hero shows "Browse 459 free skills" (filled) **and** "Show me how to connect" (outline), then the MCP box is itself the real primary action. Three things compete for the first click. **Pick one primary** ("Connect in 30s" / try it) and demote the rest.

### H4. MCP literacy gap
The hero's primary action is *paste this MCP URL*, but a cold visitor may not know what MCP is or where "Settings → Connectors" lives for their tool. The microcopy assumes Claude. Add a tool picker (Claude / Cursor / ChatGPT) that swaps the instructions, or a "What's MCP?" inline tooltip.

## 3. Medium / polish

- **M1. Hero density on mobile:** typewriter + MCP code box + 2 buttons + 4 stat tiles is a lot in the first viewport. Consider deferring the stat band below the fold on small screens.
- **M2. Stat labels mismatch primitives:** hero stats say "Souls 69+, Playbooks 32+" but copy elsewhere says "Hundreds / 50+". Tie to the same source as C1.
- **M3. `PlainEnglish` favorites in localStorage** is a nice touch but unexplained; a one-line hint ("★ pins your industry") would help discoverability (partially there at `index.tsx:644`).
- **M4. Color semantics:** red `--primary` is used both for "power/CTA" and could read as "danger/error" to some users; ensure error/destructive states (`--destructive`) are visually distinct from primary CTAs.
- **M5. Accessibility:** generally good (aria-pressed, roles, aria-hidden on decorative). Audit color contrast of `text-muted-foreground` on `surface` tints, and ensure the Typewriter has an accessible static fallback for reduced-motion users.
- **M6. Long page performance:** good use of `lazy`/`Suspense`/`ClientOnly` for heavy sections — keep that discipline if sections are added.

## 4. App surface (beyond home)

The route map is broad and well-organized (marketplace, trust pages, forge, account, admin). Two UX themes worth a dedicated pass:
- **Onboarding cohesion:** `connect`, `onboarding`, `welcome`, `match`, `generate`, `play`, `run` overlap — a single guided wizard (see PM analysis #1) would reduce the maze.
- **Trust page legibility:** the Trust Score is the core differentiator; its detail page (`marketplace.trust.$slug.tsx`) should make the weighted formula visually scannable (a labeled bar per component) so security reviewers grok it in seconds.

## 5. Quick wins (ship this PR)

1. Unify all counts to one number (C1) and Trust Score naming (C2).
2. Fix the "MIT-style" license label (C4).
3. Soften jargon in the hero, lead with benefit + ease (H2).
4. Add a clearer single primary CTA hierarchy (H3).

These are addressed in the landing-page edits accompanying this audit.
