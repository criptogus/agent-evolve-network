# Integration Marketplace

Integrations are first-class packages alongside Skills/Playbooks/Souls/Guardrails.
A Skill can declare `requires_integrations: [github, slack]`; the runtime
(Phase 3) calls them via `tool:<slug>.<action_id>` and the registry enforces
auth, scopes, and destructive-action protection.

## Why this is a moat

- **Telemetry flywheel** — every action invocation feeds
  `integration_action_runs` (anonymized, latency, success, error). Aggregate
  signal across workspaces ranks skills by *real* effectiveness, which no
  one-prompt clone can replicate without traffic.
- **Verified compatibility** — installing GitHub on a workspace causes skills
  that depend on `github` to show as "verified for your workspace", a UX cue
  competitors can't fake.
- **Side-effect taxonomy** — `read` / `write` / `destructive` is enforced at
  the registry layer; destructive actions are blocked unless the caller
  explicitly waives.

## Package layout

```yaml
slug: github
type: integration
version: 0.1.0
provider: GitHub, Inc.
auth:
  kind: oauth2
  oauth2: { authorize_url: ..., token_url: ..., scopes: [repo, ...], pkce: true }
actions:
  - { id: list_issues,   method: GET,    path: /repos/{owner}/{repo}/issues, side_effect: read }
  - { id: create_comment, method: POST,  path: ..., side_effect: write }
  - { id: delete_branch,  method: DELETE, path: ..., side_effect: destructive }
```

Schema: `content/schemas/integration.schema.json`.
Validation: `npm run validate:content` (includes `integration` type).

## Runtime wiring

```ts
import { buildToolInvoker } from "@/lib/integrations/registry";

const invokeTool = buildToolInvoker(async (slug) => {
  return await fetchInstalledIntegration(workspaceId, slug);
}, { protectDestructive: true });

await runPlaybook(compiled, inputs, { invokeSkill, invokeInstruction, invokeTool });
```

A playbook step `action: tool:github.create_comment` resolves the installed
integration for the workspace, validates scopes, executes against the GitHub
API, and emits telemetry compatible with Phase 2 ingestion.

## OAuth install flow

```
GET /api/integrations/<slug>/install?workspace_id=...&redirect_uri=...
  → { install_kind: "oauth2", authorize_url, state }
[user authorizes at provider]
GET /api/oauth/<provider>/callback?code=...&state=...
  → exchanges code, persists in integration_installations
```

## Adding a new integration

1. Copy `content/integrations/_template.yaml` to `<slug>.yaml`.
2. Fill `auth`, `actions`, and (optional) `events`.
3. Mark `side_effect` correctly — destructive actions are blocked by default.
4. `npm run validate:content`.
