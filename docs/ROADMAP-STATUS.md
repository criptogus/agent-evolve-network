# Roadmap implementation and activation status

Audited 2026-10-25 against the main branch and the published site. Code implementation,
configuration, real model qualification and production publication are separate states.

| Deliverable | Implementation | Remaining activation evidence |
| --- | --- | --- |
| CLI authoring | Valid local template, deterministic `eval`, immutable private draft upload, bearer scope and admin publication gates | Published CLI release and a real owner-controlled review |
| Registry bundles | Versioned builder; release pipeline signs and verifies every archive and manifest; rejects missing keys and empty manifests | Dedicated content-release public key registered and GitHub secrets configured; first signed release is the final integration check |
| Community collections | Public listing, owner CRUD and ordering, follow/unfollow, owner-bound atomic RPC, public-package filtering | Native migration and rollback checks passed; deploy and verify owner/anonymous UI |
| Signing key lifecycle | Versioned public registry, rotation/retirement/revocation command, validity and fingerprint checks, public registry endpoint, optional offline revocation enforcement | Register actual deployment keys; distribute current policy and configure secure rotation operations |
| Semantic discovery | pgvector index and RPC, current-version/public/approved gates, metadata indexer, explicit consent UI, authenticated 20/day allowance, bounded provider transport | pgvector migration installed; configure credentials, budget and populate the real index before activation |
| Agent Match / Jev | Candidate in draft PR #77; unchanged original qualification contract | Fresh complete quality/cost/p95 qualification, sufficient accumulated budget, then separately reviewed release |

## Production Jev inspection

The published `https://superagentskill.com/` identified itself as v0.7.1. Its `/match`
asset `match-BNZ-p2N-.js` contained none of `Jev`, `TypeSafe`, `semantic_selection` or
`selection_mode`. Lovable reports latest preview source `dc26919e01be8daba84ccbcb3e92d5624290659c`
(the draft #77), which does not identify the published artifact. The shared private database
contained one selector-cache row dated 2026-10-25 14:38 UTC; component cache evidence is not
proof of production activation or a qualified cohort. No inference was invoked for this inspection.

## Operations

- Run `npm run build:cli` and `npm run check:cli` to prevent source/distribution drift.
- Draft submission uses `20261025180000_authored_package_submission.sql`; the existing
  trust/publication triggers remain intact. A stored draft is never reported as approved.
- Collection writes use authenticated `manage_collection` and cannot set curator, fees or
  another owner's records. Anonymous reads use the server-gated routes; no public-read
  allowlist expansion is required.
- Run all three migrations plus `scripts/test-roadmap.sql` inside BEGIN/ROLLBACK first.
  Keep the native result; no fixture rows may survive. Apply only additive migrations afterward.
- Signing secrets are `CONTENT_SIGNING_PRIVATE_KEY` / `CONTENT_SIGNING_PUBLIC_KEY` in the content release
  workflow. The dedicated content-release key is registered in `security/content-signing-keys.json`; package signing uses its separate registry. No ephemeral test key can be used as a production identity. A failed signing step prevents publication. The signature manifest itself is signed, so removing a file entry is detected. The release includes a standalone Node verifier. Pin the public key fingerprint through a trusted channel.
- Rotate a registered public key with `node --experimental-strip-types scripts/manage-signing-keys.ts
  rotate security/signing-keys.json NEW_PUBLIC.pem`; the preceding active key retires.
  Revoke with `... revoke security/signing-keys.json KEY_ID REASON`. Deploy the registry and
  distribute its update to offline verifiers; an offline verifier cannot discover later revocations
  without receiving a trusted updated registry. `verify-release-bundle.ts --keyring REGISTRY`
  rejects unknown, expired and revoked keys. Preserve old public keys for historical verification.
- Embedding indexing requires explicit `--live --max-requests N`, an HTTPS endpoint, model
  and private service credentials. It checks the complete pending request count before calling
  the provider, rejects no-ops and has no automatic retries. Only public approved metadata is
  sent. Do not enable semantic search until the matching model/index has real coverage.
- Keep the original 72 Agent Match observations and primary reviews. A local preflight,
  mock embedding or successful DB migration never qualifies model quality or authorizes spending.

Historical strategy documents describe earlier snapshots. Trust Score v2, team workspaces,
telemetry and collection storage have implementations; they should not be repeatedly scheduled
as new features solely because an older analysis calls them proposals.
