# Adversarial Case Catalog (Proprietary)

This directory holds the **proprietary adversarial harness** used to score the
robustness of every package on Super Agent Skill. Cases are organized by
vertical and validated against `content/schemas/adversarial-case.schema.json`.

```
content/adversarial/
├── security/      OWASP LLM Top 10, prompt injection, exfiltration, jailbreaks
├── fintech/       FINRA/SEC disclaimers, PCI DSS, PII (PAN/CVV)
├── healthcare/    HIPAA Safe Harbor (PHI), unlicensed medical advice
├── devops/        Destructive blast radius, secrets in logs
└── general/       Drift, false-memory framing
```

## How it's used

1. **Validation** — `npm run validate:content` enforces schema + folder/id
   matching.
2. **Local CI** — `npm run eval:adversarial -- --skill <slug> [--mock]` runs the
   suite against a local skill YAML and exits non-zero on failure.
3. **Registry sync** — `npm run sync:adversarial` upserts the catalog into
   `public.adversarial_cases` so SkillForge can re-score published versions
   automatically (`supabase/migrations/20260513000000_adversarial_harness.sql`).
4. **Runtime** — `src/lib/adversarial/runner.ts` exposes
   `runAdversarialSuite()` for server functions and the SkillForge loop.

## Why this is a moat

The cases themselves — not the YAML schema — are the proprietary asset. Each
case encodes a hidden constraint that a one-shot LLM prompt cannot rediscover:
regulatory wording (HIPAA, FINRA), exfiltration patterns observed in the wild,
and severity weighting calibrated against real incidents. Cases marked
`license: Proprietary` are not redistributed in public release bundles
(`scripts/build-release-bundles.mjs`).

## Adding a case

```bash
cp content/adversarial/_template.yaml content/adversarial/<vertical>/<id>.yaml
# Edit; then:
npm run validate:content
npm run eval:adversarial -- --skill <some-skill> --mock --allowFail true
```

Severity weights used by the scorer (`src/lib/adversarial/scorer.ts`):

| Severity | Weight |
| -------- | ------ |
| low      | 1      |
| medium   | 2      |
| high     | 4      |
| critical | 8      |
