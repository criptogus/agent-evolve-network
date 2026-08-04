# Learn from skilltune.dev: narrative rewrite + yearly flat plan

Two workstreams: (1) rebuild the landing page around a hard "problem → lab → proof → letter" narrative in skilltune's blunt, evidence-first voice; (2) add an annual "everything included" plan next to monthly Pro.

## What skilltune does better (and what we borrow)

- **Opens with the pain, not the product.** A cold headline ("You create SKILL.md for AI models. But never test them.") followed by a grid of unanswerable questions ("never tested", "no way to know") ending in "You shipped it anyway."
- **Numbered proof steps.** 01 Measure, 02 Loop, 03 Benchmark, 04 Audit trail, 05 Export — each one section, each with a single visual and hard numbers.
- **Concrete before/after artifacts.** A real diff (v9 → v10), a version list with scores, a base-model-vs-tuned bar chart per dimension.
- **Founder letter.** First-person, signed, states the thesis and the evidence base.
- **Straight-talk FAQ.** Short, no marketing hedging.
- **Pricing that removes decisions.** One price, "everything included", scarcity ("first 500 accounts"), price-lock promise.

## Workstream 1 — Landing page narrative rewrite

New section order in `src/routes/index.tsx`:

1. **Hero** — tighter: one claim, one CTA, one secondary link. Keep the MCP install animation but move the "F → A" story into section 02.
2. **The problem** (new) — cold headline plus a question grid ("Does this skill improve the model?" / "Is this version better than the last?" / "Can you prove it?") each answered with a flat "never tested" style line, closing on "You shipped it anyway."
3. **The lab, in five numbered steps** — reuse and re-frame existing visuals under 01–05 headings: Measure (Trust Score), The loop (review → repair → re-score, from the install animation), Benchmark (base vs tuned, from `OutcomeComparisonChart`), Audit trail (review history / score delta we already persist), Export & run anywhere (`CompatibleAgents` + MCP one-liner).
4. **Agent Factory / University** — kept but condensed to one block each, positioned as what the lab produces at scale.
5. **Founder letter** (new) — first-person from Gustavo, signed, thesis: tested capabilities beat bigger models. Only verifiable claims; anything illustrative is labelled as such.
6. **Security promise** — kept, shortened.
7. **Pricing teaser** — rewritten around the new yearly plan.
8. **FAQ** — rewritten in the short, blunt register (What is a skill? How is it tested? Do I write evals? Can I bring an existing skill? Which tools/models? What does it cost?).
9. **Final CTA.**

Rules for the rewrite: 100% English, existing design tokens only, no invented statistics — every number either comes from our own data (registry stats, review deltas) or is visibly labelled illustrative, per the earlier audit.

## Workstream 2 — Yearly flat plan

- New product/price: **Pro Annual** — "everything included, 12 months", positioned as the default with monthly Pro kept as the flexible option. Price to confirm (proposal: $190/yr vs $19/mo, i.e. two months free).
- `/pricing` and `PlansTeaser` become a two-column monthly/annual toggle with an "everything included" feature list, plus a launch-window note if you want the scarcity framing.
- Checkout: reuse the existing embedded flow; annual is just another recurring price id. Subscription gating (`assertPaid`, `use-subscription`) already keys off status, so annual works with no logic change.
- Credits stay as-is under the hood; the annual plan is presented as "no metering to think about" while limits remain enforced server-side.

## Technical notes

- Landing sections live in `src/components/site/home/*`; new files: `Problem.tsx`, `FounderLetter.tsx`, plus a `LabSteps.tsx` wrapper that renders 01–05 and reuses `McpInstallAnimation`, `OutcomeComparisonChart` and `GradeImpact`.
- Head metadata on `/` and `/pricing` updated to the new positioning; JSON-LD FAQ regenerated from the new FAQ copy.
- New annual price created through the payments tooling as `agent_pass_pro_yearly` and wired into `useStripeCheckout`.
- No database or MCP changes.

## Open item

Confirm the annual price ($190/yr proposed) before I create it; everything else can proceed immediately.
