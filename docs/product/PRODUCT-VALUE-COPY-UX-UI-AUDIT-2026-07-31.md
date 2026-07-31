# Product Value, Copy, UX and UI Audit — 2026-07-31

> Heuristic audit of product value, positioning, copy, UX and UI across home, navigation,
> marketplace, MCP connection, pricing and acquisition flows. Based on the codebase and the
> screenshots in the repo — not on user interviews or analytics.

## Verdict

The platform has real value and defensible differentiation. Its core asset is the combination of
ready-made capabilities, verifiable evidence, portable distribution over MCP, and continuous
maintenance. The biggest current problem is trying to communicate marketplace, Agent Factory,
creator economy and trust infrastructure at the same time.

## Scorecard

| Dimension | Score |
| --- | --- |
| Potential value | 8/10 |
| Clarity | 5/10 |
| Copy | 6/10 |
| Acquisition UX | 5/10 |
| UI | 8/10 |
| Commercial trust | 5/10 |
| Conversion readiness | 6/10 |

## ICP

Priority ICP: tech leads, AI engineers and automation leads who already use MCP clients and need to
ship agents with governance. The creator economy stays as a supply strategy and must not compete
with the primary acquisition message.

## Positioning

**"Install tested capabilities in your AI agent — and keep everything safe and up to date."**

Agents and skills remain the entry doors. MCP, Trust Score and signatures become proof of the
product rather than concepts the visitor must understand up front.

## Copy — critical issues

1. Illustrative metrics presented as proven customer results.
2. "Health Score" vs "Trust Score" inconsistency.
3. Universal "no config files" install promise, while some clients require JSON/TOML plus a restart.
4. Too much internal taxonomy above the fold (soul / skills / playbooks / guardrails).
5. Occasional Portuguese/English mixing.
6. Absolute claims that are hard to defend ("zero downtime", "works instantly").

## UX

- No single canonical activation path.
- Navigation exposes the internal architecture (Browse / Create / Community / SkillForge / Forge).
- Home page too long, several sections repeating the same message.
- Marketplace optimised for exploration rather than decision.
- "$19 per agent" is ambiguous (per agent built? per connected agent? per seat?).

Recommended public navigation: **Agents, Skills, How it works, Pricing, Docs**, with one canonical
CTA — **"Try with my agent"** — and creator tooling grouped in a publishing/account area.

## UI

Strong visual identity, typographic hierarchy, responsiveness and component consistency. Main
improvements: reduce mobile density, separate action red from error red, guarantee content without
depending on animation, replace inconsistent emojis with icons, simplify comparison tables on
mobile.

## Journeys

- **Buyer / operator:** land → understand the outcome → connect an agent → install a tested
  capability → see the score → upgrade for private/custom agents.
- **Creator:** land on a creator-specific page → publish → get scored → earn. Never mixed into the
  buyer acquisition message.

## Plan

**7 days** — unify score naming, label illustrative metrics, make install promises accurate, single
canonical CTA, cut redundant home sections, reduced public nav.

**30 days** — per-client connect instructions, activation checklist, decision-oriented marketplace
filters, unambiguous pricing wording, creator area split from buyer funnel.

**60–90 days** — sandbox "try before install", reproducible public benchmarks with sample sizes,
moderated usability tests, real attributable customer proof.

## North Star

**Successful executions per active agent running a verified capability.**

Supporting metrics: connect→first-install activation rate, weekly retained agents, free→paid
conversion, and share of installs on graded (A/B) packages.

## Status of the 7-day slice (shipped 2026-07-31)

- ✅ "Health Score" removed from the product surface; Trust Score is the only name.
- ✅ Illustrative metrics labelled ("Illustrative targets") on home and in the Agent Factory proof.
- ✅ Install copy now says some clients need a config entry plus one restart.
- ✅ Hero rewritten benefit-first with one canonical CTA ("Try with my agent").
- ✅ Public nav reduced to Agents, Skills, How it works, Pricing, Docs; publishing tools behind sign-in.
- ✅ Home shortened; pipeline/compatibility/vocabulary/proof depth moved to `/how-it-works`.
- ✅ `--destructive` split from `--primary` so errors no longer look like CTAs.
