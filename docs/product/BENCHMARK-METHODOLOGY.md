# Paired Benchmark Methodology — `paired-adversarial-v1`

This spec defines how the comparative numbers on the landing page ("ungraded
skill vs. SAK A-grade skill") must be produced. A number may only be published
as **measured** when it comes from this pipeline; anything else must be
labeled illustrative.

## Principles

1. **Every claim is a comparison, so every run is paired.** The same suite,
   the same model, the same day — one arm runs the certified package, the
   other runs its uncertified baseline (`content/benchmark/baselines/`).
   Single-arm numbers are never published as comparisons.
2. **Publish the Wilson 95% lower bound, not the average.** "≥ 98.7%" must
   mean the lower confidence bound at the real sample size — conservative by
   construction (`wilson_lower_bound` in SQL, `wilsonLowerBound` in TS).
3. **Fair baselines.** A baseline is a representative copy-pasted prompt, not
   a strawman. Baselines freeze once used; changes bump the methodology
   version.
4. **Signed results.** Published runs are signed with the release Ed25519 key
   (`scripts/sign-benchmark.mjs`); the signer refuses `mode: mock`. Anyone can
   verify offline with the public key.
5. **Holdout discipline.** Public rankings score on the rotating private
   holdout (`src/lib/adversarial/holdout.ts`), so authors cannot overfit the
   published number.

## The metrics and where each one comes from

| Landing metric | Source of truth | Status |
| --- | --- | --- |
| Attacks blocked, per class | `get_attack_class_benchmark(days)` over `adversarial_runs` (arms: `certified` / `baseline`) | pipeline shipped |
| Task success rate | `skill_executions.task_completed` (self-report + sampled `outcome-grader` audits) vs `arm='control'` | pipeline shipped |
| 12-week drift vs climb | `package_weekly_metrics` (`track='current'` vs `track='frozen_v1'`) | accumulating weekly |
| Tokens / cost per task | `tokens_in + tokens_out` on executions vs `baseline_tokens` | pipeline shipped |
| p95 latency | `skill_executions.latency_ms` (p95 in weekly snapshots) | pipeline shipped |
| PII / secret leakage | `leak-scanner` over adversarial + sampled production outputs | pipeline shipped |
| Hallucination rate | LLM-judge with `hallucinationRubric`, κ-calibrated vs golden labels | pipeline shipped |
| Mean time to patch | `findings_mttr` view (finding published → fixed release signed) | pipeline shipped |

## Operating rules

- The site reads these sources live; hardcoded numbers in components are
  placeholders and must carry an "illustrative" label until replaced.
- A metric flips from *illustrative* to *measured* only when its source has
  ≥ 500 observations (executions or cases) across ≥ 5 packages.
- Mock runs (`--mock`) exist to test plumbing; they are visibly labeled and
  the signer rejects them.
- Every published benchmark links: methodology version, window, N, arms, and
  the signed JSON artifact.

## Reproduce it

```bash
node --experimental-strip-types scripts/benchmark-paired.mjs --skill code-reviewer --out benchmark.json
SIGNING_PRIVATE_KEY=… SIGNING_PUBLIC_KEY=… node scripts/sign-benchmark.mjs --benchmark benchmark.json
node scripts/sign-benchmark.mjs --verify benchmark.signed.json --pubkey pub.pem
```
