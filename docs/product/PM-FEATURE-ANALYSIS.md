# Product Manager Analysis — Feature Opportunities

> Companion to `PRD.md`. Framing: what to build next to (a) raise activation, (b) deepen the trust moat, (c) accelerate the flywheel, (d) grow ARPU. Prioritized with a rough **RICE** lens (Reach · Impact · Confidence · Effort).

---

## 1. Where the product is strong today

- **Unique trust stack** — adversarial harness + Ed25519 signing + public Trust Score + per-package offline attestation. No prompt-library competitor ships verifiable proof.
- **Self-improving supply** — SkillForge auto-learn loop (re-score → patch → A/B gate) means the catalog gets sharper without manual curation.
- **Distribution** — one MCP endpoint across Claude/Cursor/ChatGPT/Continue/Cline + `npx` install.
- **Four clean primitives** (skills/playbooks/souls/guardrails) compose well.
- **Monetization scaffolding** already present: subscriptions, credits, referrals, lineage revenue share, bounties.

## 2. Gaps / opportunities

### A. Activation & onboarding (highest leverage on revenue)
1. **Guided "Connect → first win" wizard** *(R:H I:H C:H E:M)* — detect the user's tool, give copy-paste config, then auto-suggest 3 skills for their stated role and run a live demo. Today connection + value discovery are separate pages.
2. **"Try before connect" sandbox** *(R:H I:M C:M E:M)* — run a skill on sample input in-browser (the `/play` and `/run` routes hint at this) so a cold visitor feels the value with zero setup.
3. **Role/industry-based starter bundles** *(R:M I:H C:H E:S)* — "I run a cardiology clinic" → one-click install a curated pack. Leverages existing `packs` + `collections`.

### B. Trust moat deepening (defensibility)
4. **Trust Score v2** *(R:M I:H C:M E:M)* — anti-gaming, recency-weighted, confidence intervals, per-attack-class transparency. (Full design in `EVALUATION-ALGORITHM-ANALYSIS.md`.)
5. **Continuous red-team marketplace** *(R:M I:H C:M E:L)* — bounties where security researchers submit adversarial cases; accepted cases enter the shared suite and earn CVE-style credit (`SAS-YYYY-NNNN`). Turns the community into the moat.
6. **Compliance export pack** *(R:M I:H C:M E:M)* — one-click "evidence bundle" (signatures + attestation + adversarial breakdown + audit log) formatted for SOC 2 / vendor security reviews. Direct enterprise ACV driver.
7. **Live drift alerts** *(R:M I:M C:M E:M)* — notify subscribers when a skill they depend on drops below its trust threshold or a new model breaks it.

### C. Flywheel acceleration (supply + telemetry)
8. **Execution telemetry SDK / opt-in** *(R:H I:H C:M E:M)* — the Trust Score's real-world success component is only as good as reported executions. Make `report-execution` frictionless and incentivized (credits for reporting).
9. **Author studio** *(R:M I:H C:M E:M)* — analytics dashboard for authors: installs, success rate, revenue, fork lineage, SkillForge patch suggestions to accept/reject. Drives author retention.
10. **Skill composition / "recipes"** *(R:M I:M C:M E:M)* — let users save a working stack (skills + soul + guardrails) as a shareable, installable recipe. Compounds the `collections` concept.

### D. ARPU / expansion
11. **Team workspaces + private registry** *(R:M I:H C:M E:L)* — seats, shared installs, private packs, SSO. The natural Enterprise wedge.
12. **Usage-based credits for Forge generation** *(R:M I:M C:H E:S)* — already partially present; make the "describe → custom skill from your data" path a metered premium feature.
13. **Verified vendor program** *(R:S I:M C:M E:M)* — paid "verified publisher" badge for orgs; trust + monetization.

### E. Distribution / virality
14. **Embeddable Trust Badge + leaderboard widgets** *(R:H I:M C:H E:S)* — SVG badge already planned; ship it everywhere (READMEs, docs) as a growth loop.
15. **IDE-native extensions** *(R:H I:M C:M E:L)* — beyond MCP, a Cursor/VS Code panel for one-click install raises reach.

## 3. Prioritized sequencing (suggested)

**Now (next 1–2 sprints):** 1 (guided wizard), 3 (starter bundles), 8 (telemetry frictionless), 14 (trust badge) — cheap, compounding, activation+flywheel.

**Next:** 2 (sandbox), 4 (Trust Score v2), 6 (compliance export), 9 (author studio).

**Later (bigger bets):** 5 (red-team marketplace), 11 (team workspaces/private registry), 15 (IDE extensions).

## 4. Metrics each bet should move

| Feature | Primary metric |
|---|---|
| Guided wizard / sandbox / bundles | Activation %, TTFI |
| Telemetry / author studio | Executions reported/wk, author retention |
| Trust Score v2 / compliance export / red-team | Enterprise win rate, trust-badge embeds |
| Team workspaces / Forge credits | ARPU, free→paid conversion |
| Trust badge / IDE ext | New visitors, K-factor |

## 5. Open questions for the team

- What is the current activation rate and free→paid conversion baseline? (Wire PostHog funnels first — see PRD §10.)
- Is the real-world-success telemetry actually populated, or defaulting to 0.5 for most packages? This decides whether to prioritize #8 urgently.
- Enterprise pipeline: is compliance-export the #1 blocker in sales calls? If so, #6 jumps the queue.
