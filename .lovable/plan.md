# Read-only investigation: managed Deno functions and Liquid HTTPS relay

## Findings (verified this turn)

1. **No managed Supabase/Deno edge functions exist in this project.**
   - The database has no `supabase_functions` schema (query confirmed the relation does not exist), which is where deployed function metadata would live.
   - There is no `supabase/functions/` directory in the repo.
   - Project policy explicitly forbids creating Supabase Edge Functions; all server logic runs as TanStack Start server functions / server routes on the existing Cloudflare Worker.
   - Conclusion: there is nothing to "keep" — the list of deployed managed functions is empty.

2. **Could a private secure-execution function be hosted inside this project's Lovable backend?**
   - Yes, but **not** as a Deno/Supabase edge function. The supported hosting surface is the app's own server runtime: a `createServerFn` or a server route under `src/routes/api/` (public callers under `src/routes/api/public/*` with caller verification inside the handler).
   - Such a route would reuse the existing backend (same Worker, same secrets store, same deployment) and would **not** need any access to the Liquid database — it would act purely as an HTTPS relay/validator.
   - The Liquid constraint (HTTPS to a validated public IP with SNI/certificate of the original hostname) can be satisfied server-side: the Worker runtime's `fetch` supports TLS with SNI, and certificate/hostname pinning can be enforced in the handler (e.g. pinned SPKI fingerprint or CA check). No raw unpinned fetch, no external runtime, no TLS relaxation.

## Proposed plan (no action taken yet)

1. Confirm with the user the exact Liquid endpoint contract (target hostname, IP, expected certificate/pin, request/response shape, auth mechanism for callers).
2. Implement a single authenticated server route `src/routes/api/public/liquid-relay.ts` that:
   - Verifies the caller (shared secret or signed token, stored in Project Settings → Secrets).
   - Performs the outbound HTTPS request with SNI set to the original hostname and certificate pinning enforced.
   - Returns only the validated response; never touches this project's database tables beyond optional audit logging.
3. Add no new dependencies; do not modify package.json or lockfiles.
4. Verify with read-only probes (status codes only) before any publish.

## Technical details

- Runtime: Cloudflare Worker (workerd) via TanStack Start server routes — server-side `fetch` supports SNI; pinning implemented by validating the TLS peer certificate fingerprint where the platform exposes it, or by constraining to a known CA + hostname.
- No Supabase Edge Functions will be created, kept, or modified. No database, key, config, or publish changes are part of this investigation.
