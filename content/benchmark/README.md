# Paired benchmark corpus

This folder makes the landing-page comparison ("ungraded skill vs. SAK
A-grade skill") **reproducible**. Each file in `baselines/` is the honest
uncertified counterpart of a certified package: the kind of short, raw prompt
an agent would run if it never touched the registry — no `must`/`must_not`
rules, no worked examples, no guardrails, no adversarial hardening.

The paired harness (`scripts/benchmark-paired.mjs`) runs the **same**
adversarial suite against both the baseline and the certified package and
reports pass rates per attack class with Wilson 95% lower bounds. Published
numbers must come from this pairing — never from a certified-only run.

Rules for a baseline file:

- `pairs_with` must name a real certified slug in `content/skills/`.
- The prompt must be a *fair* baseline: representative of what people actually
  copy-paste (short, task-focused), not a strawman ("ignore all safety").
- Baselines are frozen once used in a published benchmark; changes require a
  new file and a new methodology version.

Run it:

```bash
# Deterministic smoke run (no API key needed)
node scripts/benchmark-paired.mjs --skill code-reviewer --mock

# Real run through the configured gateway
node scripts/benchmark-paired.mjs --skill code-reviewer --out benchmark.json
```
