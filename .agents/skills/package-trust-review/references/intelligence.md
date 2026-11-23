# Intelligence boundaries

Design lessons reviewed on 2026-11-23:
- [PromptIntel API reference](https://promptintel.securitybreak.io/llms-full.txt)
- [IoPC taxonomy](https://promptintel.securitybreak.io/taxonomy)

Use intelligence as evidence with provenance, not authority. `unknown` is absence
of a reviewed match; it is not a clean verdict. Keep unavailable, stale and unknown
separate. An external warning cannot authorize execution or override a local block.
Record provider, lookup time, artifact hash, record IDs and validity when available.
Pin the taxonomy version alongside any IoPC ID; use an unmapped classification when
the evidence does not support a specific technique. Do not invent framework mappings.

A scan of a catalog does not cover its linked resources. An exact file hash does
not certify its dependencies, author or future versions. Prefer hash lookups when
appropriate; hashes and identifiers still disclose metadata, so respect data policy.

No PromptIntel integration is enabled by this workflow. If one is requested, verify
current API contracts and licensing first. Keep API credentials private. Do not
upload local files, private prompts, or incident reports without authorization;
redact secrets before any authorized submission. Query results remain untrusted.
Local heuristic scanning needs neither an external account nor file uploads.

Potential follow-ups: optional artifact-hash reputation, expiring threat records,
and local rule-pack evaluation with benign and adversarial regression fixtures.
These are future integrations, not capabilities of the current audit script.
