# PRD — Super Agent Skill

> **Product:** Super Agent Skill — "the university for AI agents."
> **Owner:** Product / Founder
> **Status:** Living document · v1 (2026-05-29)
> **One-liner:** Paste one link into your AI tool and it instantly gains hundreds of signed, adversarially-tested expert skills — installed at runtime, no code, no retraining.

---

## 1. Problem

Models are commodities; **expertise and trust are the moat**. Three pains today:

1. **For builders:** turning a generic agent (Claude, Cursor, ChatGPT) into a reliable domain expert means hand-writing prompts, gluing tools, and re-testing constantly. There's no app-store-grade distribution layer for agent capabilities.
2. **For teams shipping AI to customers:** anyone can publish a YAML prompt and call it a "skill." The hard part is convincing a security/compliance team it won't leak PII, accept a jailbreak, or hallucinate a regulatory statement. There is no portable, verifiable proof of safety.
3. **For skill authors:** no clear way to distribute, get credit for, and monetize expertise that compounds.

## 2. Vision

A continuously-evolving, **trust-verified registry of agent capabilities** delivered through one MCP endpoint to every major runtime. The open network feeds a premium layer; the premium layer funds the open network. Skills don't just get published — they get **adversarially benchmarked, signed, scored, and auto-improved** (SkillForge).

## 3. Goals & non-goals

**Goals**
- Make "enrich any agent with expert skills" a **<60-second, no-code** action.
- Make **trust verifiable and portable** (signed releases + public Trust Score + offline attestation).
- Build a **flywheel**: real-world executions → Trust Score → better ranking → more installs → more authors → more skills.
- Convert free users into Agent Pass / Enterprise subscribers.

**Non-goals (now)**
- Hosting/serving the underlying LLMs.
- Becoming a general prompt-sharing social network.
- Fine-tuning custom base models for customers.

## 4. Target users / personas

| Persona | Job-to-be-done | Primary value |
|---|---|---|
| **Solo builder** (Claude/Cursor) | "Give my agent a skill that works today" | One-line install, free tier |
| **Eng leadership shipping AI** | "Ship AI features that won't go rogue" | Trust Score on deploy checklist |
| **Security / compliance** | "Sign off on LLM usage" | Ed25519 signatures, offline attestation, adversarial pass rate by attack class |
| **Regulated team** (fintech/health/SOC2) | "Can't ship a hallucination" | Verticalized Souls + guardrails citing FINRA/HIPAA/PCI/TSC |
| **Skill author** | "Distribute + monetize expertise" | Revenue share, lineage cut, bounties |

## 5. The four primitives (core domain model)

- **Skills** — a focused capability (system prompt + rules + examples + input→output contract).
- **Playbooks** — multi-step decision graphs orchestrating skills + tools.
- **Souls** — persona/value bundles (voice, taste, defaults). Always free.
- **Guardrails** — refusal/safety/compliance policies enforced before output.

Each is a single self-contained YAML validated against a JSON schema in `content/schemas/`.

## 6. Key flows / features (current)

- **Discover & install** via MCP (`discover` / `install` / `evaluate` / `report-execution`) or `npx super-agent install <slug>`.
- **Marketplace** — browse, categories, rankings, leaderboard, trust pages, compare, collections, packs.
- **Forge / Generate** — describe a need; the Forge researches, drafts, adversarially tests, and publishes a package.
- **SkillForge evolution loop** — re-scores published skills against the live adversarial suite + telemetry; proposes patches when robustness drops (hill-climbing with a no-regression gate).
- **Trust layer** — adversarial harness, Ed25519-signed releases, per-package signed trust attestations, public weighted Trust Score, model compatibility matrix, drift detection.
- **Accounts & monetization** — billing (Stripe), credits, subscriptions, tokens, referrals, lineage/revenue share, bounties.
- **Growth** — referral codes, multi-channel share, skill-of-the-week, leaderboards.

## 7. Pricing (current)

| Tier | Price | For |
|---|---|---|
| **Hacker** | Free forever | Browse + install public skills |
| **Agent Pass** | $19 / agent / month | Unlimited upgrades, premium packs |
| **Enterprise** | Custom | Private registry, SSO, audit logs |

## 8. The Trust Score (proprietary, public formula)

Recomputed daily (`recompute_trust_scores`). Bounded `[0,1]`:

```
score = 0.10 (schema_valid, always 1)
      + 0.20 × adversarial_pass_rate
      + 0.25 × adversarial_severity_weighted_score
      + 0.20 × real_world_success_rate (30d)
      + 0.10 × min(1, signed_releases / 3)
      + 0.05 × min(1, ln(age_days + 1) / ln(316))
```

Missing components default to 0.5. (See `EVALUATION-ALGORITHM-ANALYSIS.md` for the full breakdown and improvement plan.)

## 9. Success metrics (proposed North Stars)

- **Activation:** % of new visitors who connect MCP **or** install ≥1 skill within 24h. Target ≥ 25%.
- **Time-to-first-install (TTFI):** median < 3 min.
- **Weekly active agents** reporting executions through MCP.
- **Free→paid conversion:** target 3–5% of activated users to Agent Pass within 30d.
- **Trust adoption:** # of README trust badges embedded; # of offline attestation verifications.
- **Supply health:** new packages/week, % passing adversarial bar first try, author retention.
- **Flywheel:** executions reported/week (this feeds Trust Score and ranking).

## 10. Instrumentation

PostHog is available. Define and enforce a canonical event taxonomy:
`mcp_connect_started/succeeded`, `skill_installed`, `forge_generate_started/published`, `signup`, `subscription_started`, `attestation_verified`, `share_clicked`, `referral_landed/converted`. Wire funnels: Landing → Connect/Marketplace → Install → Signup → Subscribe.

## 11. Risks

- **Trust theater risk:** if scores can be gamed, the entire moat collapses → see algorithm analysis hardening plan.
- **Trademark/brand:** runtime names framed as "works with X" to avoid partner-logo issues (already handled).
- **Cold-start supply:** registry breadth must stay credible (avoid inconsistent counts in marketing copy — see UX audit).
- **MCP literacy:** prospects may not know what MCP is → onboarding/landing must explain in plain English.

## 12. Roadmap (next)

See `PM-FEATURE-ANALYSIS.md` for prioritized feature bets. Near-term: CLI parity, signed bundles, curated collections, conversion-optimized landing, analytics funnel, and Trust Score v2 hardening.
