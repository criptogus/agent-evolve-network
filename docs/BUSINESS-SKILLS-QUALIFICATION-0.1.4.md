# Business skill qualification: 0.1.4

Evaluated on 2026-10-23 (local date), before authenticated publication. This report describes the tested configuration, not arbitrary-model or live-tool certification.

## Executed evidence

- Original suite: **273/273 passed**, 21/21 eligible, zero high/critical failures, zero inference errors and zero truncated outputs. Original inputs, contexts, severities, expectations and thresholds are unchanged.
- Supplemental structured-context attacks: **5/5 passed** on the same frozen runtime/model/package.
- Primary review: all273 traces, grouped into93 distinct evidence groups; every verdict bound to its actual output SHA-256.
- Same-model comparison: immutable0.1.3 **245/273** to0.1.4 **273/273**. Prior failures remain retained.
- Advisory: Jev1.14.0 completed21 requests,120188 input/8316 output tokens. Four negative advisory judgments and all probabilities are retained. Primary re-review verified the NF-e provisional match, two static MCP permission conclusions and unresolved A/B contradiction against original expectations and actual host code. The advisory input retains the original client receipt; the runtime discards it and actually recomputes host validation. Advisory judgments do not override approval gates.

## Compatibility boundary

`mlx-community/Qwen3.5-9B-4bit@8b2b98c00a6b4d291155e4890773ca8f769aee53` with the exact packaged `redact-route-generate-v1` runtime, Python3.12.15/arm64, MLX-VLM0.6.13, MLX0.32.0, temperature0, seed0 and maximum768 final-generation tokens. Weight, tokenizer/configuration, source and archive digests are pinned. Bare prompts, other model/runtime versions and live tool execution are unqualified.

Required business records belong in structured `context.input`; ancillary source-note annotations are quarantined. Supported sensitive fields are redacted before real local routing and generation. Raw final text is retained without repair or replacement.

## Validation

- Project batch10/10 passed:222 Node tests, types, SDK types, audit, build, strict lint, source/helper and generated-artifact checks.
-22 deterministic runtime tests and4 recovery tests executed within the batch.
- Packaged CLI real-inference smoke completed;3/3 configuration refusal checks passed.
- RLS/anonymous checks audited92 public tables with no unexpected exposure.
- Bun frozen-lock installation and all five GitHub PR checks passed before final integration.
- Registry imports and evidence/compatibility transactions were tested with rollback; all21 source/archive bindings verified. Compatibility SQL changes no publication flags; authenticated review remains required.
- No Lovable generation calls used.

## Retained evidence digests

| Evidence | SHA-256 |
| --- | --- |
| `plan.json` | `eafbc663ce2b69a1e946c77acd8eeb795eea66a0a168a6e0adb0829748354ba8` |
| `outputs.jsonl` | `308c46e4a7979bbd038b5f2d571743f109a25f97d028dafdb7af5b3f7e98f0fd` |
| `runtime.json` | `3a59239fece4f2e20c156b955e27c0a8915421c795b2f075562291747691052b` |
| `reviews.json` | `c7bb0d7c96001ef1821ac0d7a7bd52ffeb92134a76c92c9858d37584fe697019` |
| `report.json` | `5b5ec5a9ae88180c689386acb0bde4e6b7b05b04f7116fdc84527ed024246858` |
| `comparison.json` | `eec86d89140d565ff6672e14f3725277b2f399595953e58de863f629d6fbe481` |
| `context-regressions/outputs.jsonl` | `372923d723e2fa52c34d646afaf30bd4053a1986261dd199fe92b24d1f8ae537` |
| `context-regressions/reviews.json` | `c01336731023bde71514a206a9e7b91c1efda7a3de0487d13cbabd760a384432` |

Private execution evidence is retained under `artifacts/adversarial-business/run-0.1.4-qualified-local/`. Reuse the finite scripts and approval gates in [the evaluation workflow](ADVERSARIAL-BUSINESS-EVALUATION.md); diagnostics or pilots never qualify.
