# Optional Jev discovery in Agent Match

Status: implemented for observation; filtered rollout requires paired end-to-end qualification.

Agent Match currently supplies up to 800 approved, published package metadata records to its generator. A separate TypeSafe client now scores task relevance before that call. It does not generate the kit, approve a package, change model compatibility or weaken any existing output validation.

## Data and authority

`semantic_selection` defaults to false. The user must explicitly consent to sending their brief, vertical and public candidate descriptions to TypeSafe. `TYPESAFE_API_KEY` is a server secret; it has no VITE prefix, browser use or fallback to the Lovable gateway. Existing publication/status filters run before selection. Generator output remains restricted to candidate slugs and correct package types, with the original count/score and MCP checks preserved.

The fixed provider is `https://api.typesafe.ai/v1/systemone`, model `jev-1.14.0`, protocol `agent-match-v4`. Individual questions name the capability and slug explicitly; numeric-index-only references caused unreliable results in the initial live pilot. Matching asks about intended jobs, rather than whether all execution records are already supplied in the brief. Input/output/schema bounds, exact answer sets and actual model are validated.

## Operation

- Set `TYPESAFE_API_KEY` securely on the server. Do not copy the local Keychain credential into source, a VITE variable, logs or a PR.
- `JEV_AGENT_MATCH_MODE=off` disables calls. Missing key, invalid mode or absent consent also makes zero calls.
- `shadow` is the default. It records scores/selection metrics while forwarding the complete original catalog. It adds bounded evaluation cost and does not claim token savings.
- `filter` is an explicit operator setting for a qualified rollout, not a client parameter. Never activate merely because the smoke test passes. Compare full-catalog and filtered kits on the same representative tasks, measuring final quality and total model costs first.
- Score the full catalog, in batches of at most 40 candidates with at most four calls in parallel. There is no lexical shortlist that silently discards unexamined candidates. The existing 800-row catalog limit bounds calls at 20. Global deadline: 3 seconds (hard maximum 5 seconds in test/options); no automatic retries or redirects. Each request and response has a byte cap.
- Filtering retains every candidate above 0.1 relevance, including ambiguous candidates. It requires at least one score >=0.8 and per-type coverage of requested counts plus two alternatives (limited by actual availability). These are conservative experimental selection settings, not calibrated correctness guarantees. When a type lacks the minimum, restore every candidate of that type, retaining original order; no confident match still restores the entire catalog. This v4 change preserves the same minimum counts and uncertainty thresholds. No evidence means full-catalog recovery.
- Any malformed response, wrong model, missing/extra score, HTTP/network/deadline error or failed batch restores the whole original catalog. Partial successful batches cannot prune. Unknown usage after a failed request is explicitly marked incomplete rather than reported as free.
- No semantic cache was added in this first integration; there is no cross-tenant cache of briefs. Candidate pruning runs only against the current catalog. Do not interpret omitted candidates as proof that the marketplace lacks a capability.

The response and structured server metrics include the actual selected/forwarded counts, Jev usage, protocol/model, status/reason and latency, plus generator input/output usage when supplied by its provider. They exclude briefs, package text, API keys and raw provider error bodies. Capture the metrics in the deployment's existing log system; no claim of durable database telemetry is made.

## Validation and limitations

The normal project batch tests consent/configuration no-call gates, provider contract, shadow behavior, conservative recovery, model drift, malformed answers/usage, deadline, response bounds, full-catalog order, concurrency and failed-batch recovery. A separate explicit live runner uses the production adapter and frozen synthetic fixtures; it never calls the generative gateway or application POST endpoint.

Live protocol histories on 2026-10-24:

| Protocol       | Smoke result | Input/output tokens | Outcome                                                      |
| -------------- | ------------ | ------------------- | ------------------------------------------------------------ |
| agent-match-v1 | 6/8          | 25,260 / 2,976      | Retained as failed evidence                                  |
| agent-match-v2 | 7/8          | 29,188 / 2,976      | Retained as failed evidence                                  |
| agent-match-v3 | 8/8          | 36,580 / 2,976      | Discovery smoke passed; not end-to-end quality qualification |

The 0.8 expected-candidate check and original eight briefs stayed fixed. No fixture or threshold was weakened. Records live in `artifacts/jev-agent-match-live*-20261024/results.json`; the earlier independent Choice pilot is a different protocol and cannot qualify this one.

The owner authorized up to US$5 accumulated in native Lovable AI inference. Both backend credentials are configured and verified through readiness probes. The real paired v16 prefix completed 14/72 observations: eight primary passes and six failures, with p95 regression. Attempt 15 remained unknown and was stopped without replay. This is rejected, incomplete qualification; production filtering remains unpromoted. See the paired evaluation document for preserved billing, reservations, fixes and the next frozen profile. The 21 skills' registered artifacts, adversarial evidence and restricted supported runtime remain untouched.

Full-catalog selection evidence: the initial v3 round (36 observations, 612 real calls) forwarded all 665 candidates in 32 observations. The v4 repair restores only undersupplied types, while preserving all their alternatives. A separate 36-observation real round forwarded an average 328.39 candidates; six absent-capability observations correctly retained the entire catalog. Every frozen required slug was retained. Both rounds are preserved and neither qualifies generator quality, total cost or latency. The owner expanded the accumulated Lovable inference cap to US$7. Failed v18/v19 prefixes and the invalid v20 source quotation remain preserved and rejected; v21 labels literal evidence separately from the package name and retains exact validation. Native billed upper bounds and unknown reservations remain deducted across rounds. Provider caching applies to both arms and can make the full catalog cheaper than filtering; reduced forwarded tokens alone cannot qualify rollout.
