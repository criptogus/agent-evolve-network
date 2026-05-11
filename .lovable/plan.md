# MCP OAuth: real install, like OAuth

## Goal

Paste `https://superagentskill.com/api/mcp` in any MCP client → client opens a browser popup → user logs in on our site → clicks "Authorize" → popup closes → agent has tools. No tokens copy-pasted, no JSON edited (JSON stays as a fallback for legacy clients).

## How real MCP OAuth works (MCP spec 2025-06-18 / OAuth 2.1 + PKCE + DCR)

```text
1. Client POSTs to /api/mcp without Authorization
                  ↓
2. Server → 401 + WWW-Authenticate: Bearer
                  resource_metadata="https://.../.well-known/oauth-protected-resource"
                  ↓
3. Client fetches .well-known docs to discover auth endpoints
                  ↓
4. Client POSTs /oauth/register (Dynamic Client Registration, RFC 7591)
                  → gets client_id (no secret — public client w/ PKCE)
                  ↓
5. Client opens user-agent at /oauth/authorize?...&code_challenge=...&state=...
                  ↓
6. User logs in on superagentskill.com (Google or email — existing auth)
                  ↓
7. Consent screen: "Allow <ClientName> to access your Super Agent Skill?"
                  ↓
8. Redirect to client's redirect_uri with ?code=...&state=...
                  ↓
9. Client POSTs /oauth/token with code + code_verifier → access_token + refresh_token
                  ↓
10. Client retries /api/mcp with Authorization: Bearer <token> → 200, tools list streams in
```

## Build plan

### 1. Database (one migration)

Three new tables, all scoped by user:

- **`mcp_oauth_clients`** — registered MCP clients (one row per Claude/Cursor/etc install)
  - `client_id` (text, PK), `client_name`, `redirect_uris` (text[]), `token_endpoint_auth_method` ('none' for public), `created_at`
  - Public registration (no auth required for DCR per spec), but rate-limited by IP via a separate table.
- **`mcp_oauth_authorizations`** — short-lived auth codes (5 min TTL)
  - `code_hash` (PK), `client_id`, `user_id`, `redirect_uri`, `scope`, `code_challenge`, `code_challenge_method`, `expires_at`, `used_at`
- **`mcp_oauth_tokens`** — issued access + refresh tokens
  - `token_hash` (PK), `kind` ('access' | 'refresh'), `client_id`, `user_id`, `scope`, `expires_at`, `revoked_at`, `parent_token_hash` (for refresh rotation)

RLS: only the owning user can list/revoke their own tokens via the account page. Server-side issuance uses `service_role` via a security-definer function.

A pruning function `prune_mcp_oauth()` deletes expired codes + revoked/expired tokens (run via cron later).

### 2. Public routes under `/oauth/*` and `/.well-known/*`

| Route | Method | Purpose |
|---|---|---|
| `/.well-known/oauth-protected-resource` | GET | Points to `/api/mcp` as the resource + lists our auth server |
| `/.well-known/oauth-authorization-server` | GET | Standard OAuth metadata (issuer, endpoints, PKCE methods, supported grants) |
| `/api/public/oauth/register` | POST | RFC 7591 Dynamic Client Registration. Validates `redirect_uris` (http://localhost:* allowed, https:// required otherwise), returns `client_id`. |
| `/oauth/authorize` | GET (page) | React route that loads session, shows login if logged out, then a Consent screen with client name + requested scopes |
| `/api/public/oauth/consent` | POST | Called by the consent UI — generates a 10-min auth code bound to (client_id, user_id, code_challenge, redirect_uri), redirects to redirect_uri with `?code=&state=` |
| `/api/public/oauth/token` | POST | Exchanges code + `code_verifier` for tokens, OR refresh_token for new tokens. Returns standard JSON. |
| `/api/public/oauth/revoke` | POST | RFC 7009 revocation |

### 3. Update `/api/mcp` to be OAuth-aware

- Currently anonymous-allowed for read tools, Bearer-required for write tools.
- New behavior:
  - If `Authorization: Bearer <token>` present → verify against `mcp_oauth_tokens` (and existing personal access tokens from `/account/tokens` — backward compatible).
  - If token valid: attach `user_id`, allow all tools per the user's plan.
  - If missing / invalid: still allow public read tools (so unauthenticated clients keep working). For write tools, return 401 with `WWW-Authenticate: Bearer resource_metadata="..."`. This makes write tools trigger OAuth automatically in compliant clients.
- Add an "Authorized as <name>" hint to the `instructions` field on authenticated calls.

### 4. Frontend pages

- **`/oauth/authorize`** route — handles the user-agent step:
  - If logged out → redirect to `/login?next=/oauth/authorize?...` (existing login already supports Google + email).
  - If logged in → render the Consent page: client name, requested scopes (`read:registry`, `write:registry`, `report:telemetry`), Authorize / Deny buttons. Includes a small "Heads up: this connects <ClientName> to your Super Agent Skill account" banner.
  - Authorize → calls `/api/public/oauth/consent` which 302s back to the client's `redirect_uri` with `?code=&state=`.
- **`/account/connections`** (new) — list issued OAuth tokens (client name, issued, last used) with a Revoke button. Linked from the existing account menu.

### 5. Home + Connect page UX update

- Home `McpInstallAnimation`: replace step 2 ("paste config") with a real **OAuth popup flow**:
  1. Copy the URL (already animated).
  2. Client opens browser popup on `superagentskill.com/oauth/authorize` (animated mock that mirrors the real screen).
  3. Tools light up — same ending as today.
- `/connect` page: keep all the JSON snippets as a "manual install (fallback)" expandable section. Move "Connect with one URL" + OAuth explainer to the top with a list of clients that support MCP OAuth natively today (Claude Desktop, Claude Code, Cursor 0.45+, Windsurf, VS Code 1.95+) and a note that older Codex CLI versions still need the manual JSON.

### 6. Token validation: unified

A single server helper `verifyMcpBearer(token)` checks:
1. PAT prefix `sas_pat_…` → existing personal-access-token table.
2. Else → OAuth access token table.
Both return `{ user_id, scope, source }`. Used by `/api/mcp` and the MCP write tools.

## Out of scope (this turn)

- Refresh token rotation cleanup cron (we'll add later via pg_cron).
- Per-client scope policies / scope upgrade dialogs.
- Claude Desktop deep-link install (`claude://...`) — Claude will discover OAuth automatically from the URL.
- Migration of existing PATs into OAuth — both keep working.

## Technical notes for the implementer

- All OAuth routes live under `src/routes/api/public/oauth/*.ts` so they bypass auth middleware. The single user-facing page is `src/routes/oauth.authorize.tsx`.
- Code/token storage: store only **SHA-256 hashes** of the raw codes/tokens; raw values are only ever returned in the issuing response. Use `crypto.subtle` in the Worker runtime.
- PKCE: only `S256` accepted (reject `plain`). Code verifier 43-128 chars, base64url.
- Access tokens: 1 hour TTL. Refresh tokens: 30 days, rotated on every use (old refresh marked revoked, new one issued).
- `/.well-known/oauth-protected-resource` advertises `resource: "https://superagentskill.com/api/mcp"` and `authorization_servers: ["https://superagentskill.com"]`.
- `/.well-known/oauth-authorization-server` advertises: `issuer`, `registration_endpoint`, `authorization_endpoint`, `token_endpoint`, `revocation_endpoint`, `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code","refresh_token"]`, `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported: ["none"]`.
- CORS: all `/api/public/oauth/*` routes return `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization`. Pre-flight handled.
- `/api/mcp` 401 response must include `WWW-Authenticate: Bearer resource_metadata="https://superagentskill.com/.well-known/oauth-protected-resource"` — clients use this header (not the body) to discover the auth server.

## Files (new)

```text
supabase/migrations/<ts>_mcp_oauth.sql
src/lib/oauth/mcp-oauth.server.ts        # hash, validate, persist helpers
src/lib/oauth/mcp-oauth.functions.ts     # consent + token-list server fns
src/routes/api/public/oauth/register.ts
src/routes/api/public/oauth/token.ts
src/routes/api/public/oauth/revoke.ts
src/routes/api/public/oauth/consent.ts   # called by /oauth/authorize page
src/routes/api/public/.well-known/oauth-authorization-server.ts
src/routes/api/public/.well-known/oauth-protected-resource.ts
src/routes/oauth.authorize.tsx
src/routes/account.connections.tsx
```

## Files (edited)

```text
src/routes/api/mcp.ts                    # 401 with WWW-Authenticate; Bearer validation
src/lib/mcp/tools/skills.ts              # use unified verifyMcpBearer
src/components/site/McpInstallAnimation.tsx  # show real OAuth popup step
src/routes/connect.tsx                   # OAuth banner + collapsible JSON fallback
src/routes/account.tokens.tsx            # link to /account/connections
```

## Approval

I'll start with the migration, then the OAuth endpoints, then the consent page, then wire it into `/api/mcp` and update the home/connect UX. Shall I proceed?
