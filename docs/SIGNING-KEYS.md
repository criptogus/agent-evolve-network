# Signing keys — runbook

Two independent Ed25519 keyrings anchor every "verifiable" claim this project
ships. Both follow the `sak-signing-keyring/v1` spec (see
`src/lib/trust/keyring.ts`): at most **one active key per ring**, retired keys
keep verifying historical artifacts, revoked keys verify nothing.

| Ring                   | File                                 | Signs                                                                                      | Key material                                                                |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Site/trust/plugin ring | `security/signing-keys.json`         | Trust attestations, benchmark signatures, agent-plugin packages (zip + signature sidecars) | GitHub secrets `SIGNING_PRIVATE_KEY` / `SIGNING_PUBLIC_KEY` + local `.env`  |
| Content release ring   | `security/content-signing-keys.json` | Registry release bundles (`content-v*` tags)                                               | GitHub secrets `CONTENT_SIGNING_PRIVATE_KEY` / `CONTENT_SIGNING_PUBLIC_KEY` |

**Important:** since the site ring is registered (key id `25de98852a1efe47`,
registered 2026-10-31), signing and verification are **fail-closed**: an env
key that is not the active ring key produces NO signature (the download degrades
to an explicit `unsigned_reason`) and forged signatures verify as `false`.
The same applies to an empty/anchorless ring — that was the pre-fix behavior
and it is not coming back.

## Daily use (verification)

```bash
# Offline verification of a signed package (no network, no hosted service):
npm run trust:verify -- --attestation pkg.trust.json --pkg pkg.yaml --pubkey pub.pem

# Verify a release bundle against its ring:
node --experimental-strip-types scripts/verify-release-bundle.ts \
  --dir dist/release --keyring security/content-signing-keys.json
```

## Rotation procedure (a key is suspect, or a scheduled rotation)

1. **Generate a fresh pair** (never reuse disks/machines for old+new):

   ```bash
   openssl genpkey -algorithm ed25519 -out new.private.pem   # PRIVATE — never commit
   openssl pkey -in new.private.pem -pubout -out new.public.pem
   chmod 600 new.private.pem
   ```

2. **Register the public half** (retires the previous active key):

   ```bash
   node --experimental-strip-types scripts/manage-signing-keys.ts \
     rotate security/signing-keys.json new.public.pem
   git add security/signing-keys.json && git commit -m "rotate site signing key"
   ```

3. **Update the consumers of the PRIVATE half**, in this order to avoid a
   signing outage: GitHub secrets (`SIGNING_PRIVATE_KEY`, `SIGNING_PUBLIC_KEY`),
   then the local `.env`, then any KMS/secret-manager copies. Old artifacts
   signed with the retired key keep verifying (rotation never breaks history).
4. **Revoke** only if the old key is actively compromised (not merely retired):

   ```bash
   node --experimental-strip-types scripts/manage-signing-keys.ts \
     revoke security/signing-keys.json <16-char-key-id> "compromised, see SAS-YYYY-NNNN"
   ```

Deployments that verify offline must receive the updated `security/*.json`
(served publicly at `/api/public/signing-keys.json`) or, for the content ring,
the `SIGNING_KEYS.json` shipped in every release zip.

## What the public ring endpoint guarantees

`/api/public/signing-keys.json` serves the site ring verbatim. Consumers pin
against the ACTIVE key listed there; the CI guard (`secret-scan` workflow →
`keyring hygiene` step) fails the build if the ring is unparsable, has zero or
more than one active key, or has a fingerprint mismatch.

## Storage rules

- **Never** commit a private PEM. The private half lives in your key manager,
  the GitHub secret store, and (optionally) a local chmod-600 file.
- The public half is public by construction — commit it, ship it, badge it.
- `security/signing-keys.json` changes are auditable commits; never edit the
  file by hand — always through `scripts/manage-signing-keys.ts`.
