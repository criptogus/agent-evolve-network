# Ready for Agent Plugins v1 (agent-plugins.org)

Agent Plugins is the new vendor-neutral package format (TSC from Amazon, Cursor, Microsoft, OpenAI, Vercel) that wraps two component types we already ship: Agent Skills (`SKILL.md`) and MCP servers. Verified spec v1.0.0 requirements: a plugin is a directory with a required root `plugin.json` (closed schema: `$schema`, `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions`), optional `skills/<name>/SKILL.md`, and optional root `mcp.json` (`$schema` + `mcpServers`, per-server `stdio` / `streamable-http` / `sse` variants).

Our current state: `content/skills/*.yaml` is the source of truth, `scripts/build-skills-sh-mirror.mjs` already emits spec-correct `skills/<slug>/SKILL.md`, and we serve a hosted MCP endpoint at `/api/public/mcp`. We are one manifest layer away from being a conformant plugin publisher.

## 1. Repo becomes a conformant plugin

- Add root `plugin.json` (`name: superagentskill`, version from `src/lib/version.ts`, homepage/repository/license/keywords, `author`) so `npx`-style clients that read Agent Plugins can consume this repo directly. The existing `skills/` mirror already satisfies the skills component location.
- Add root `mcp.json` declaring our hosted server as `type: "streamable-http"` with `url: https://superagentskill.com/api/public/mcp` (no secrets in `headers` — auth stays client-managed, as the spec requires).
- Extend `scripts/build-skills-sh-mirror.mjs` (or a sibling `scripts/build-agent-plugin.mjs`) to generate both manifests from the same content source, plus a `--check` mode wired into `npm run check:skills-mirror` and the validate-content workflow so manifests never drift from the platform version.

## 2. Per-skill and per-agent plugin packages (download + API)

- New generator producing one plugin directory per catalog item: `plugin.json` + `skills/<slug>/SKILL.md` (+ `references/` when the skill has examples), reusing the current serializer.
- New endpoints under `src/routes/api/public/`:
  - `plugins/<slug>/plugin.json` and `plugins/<slug>/mcp.json` — manifests served from live database content.
  - `plugins/<slug>.zip` — the full portable plugin package (skill files + manifests), so any conformant client can install a graded SAK skill with no account.
  - `plugins.json` — an index of available plugins for discovery.
- Agent Store items (soul + skills + playbooks) map naturally to a multi-skill plugin: one `plugin.json`, several `skills/*`, `mcp.json` pointing at our server for graded updates. Pro gating stays where it is today.

## 3. Conformance validator

- `scripts/validate-agent-plugin.mjs`: validates generated manifests against the v1 rules we must not violate — closed top-level fields, plugin `name` charset (`a-z0-9-.`, no `--`/`..`, alphanumeric ends, 1-64 chars), canonical `$schema` identifiers, plugin-relative paths starting with `./` and contained in the plugin root, HTTPS-only non-loopback MCP URLs, no credentials in headers.
- Tests in `tests/agent-plugins.test.mjs` covering a valid manifest, each fatal violation, and the packaged skill layout.

## 4. Communicate it (this is the point of "preparing")

- Landing: extend the existing `OpenSkills` section into "Works with the open agent standards" — Agent Plugins v1, Agent Skills `SKILL.md`, and MCP — with a copyable install line and the differentiator kept as-is (the standards give distribution; SAK adds the Trust Score, adversarial pass rate and before/after proof).
- `/docs`: new "Agent Plugins (v1)" block with the layout we emit, the manifest example, the package download URL, and the compatibility matrix row added to `INSTALL_ROUTES` in `src/lib/skills/open-skills.ts`.
- `/marketplace/<slug>`: extra install option "Download Agent Plugin (.zip)" next to the existing commands.
- `/how-it-works`, `/welcome`, `/agents.md`, `/llms.txt`: one line each declaring Agent Plugins v1 conformance and the plugin endpoint, since agents read those first.
- Update `head()` descriptions on the touched routes; ship as a minor version bump via `scripts/bump-version.mjs` with a CHANGELOG entry.

## Technical notes

- No database schema changes, no new secrets, no new dependencies (zip built with a small pure-JS store-only writer or an existing dependency if one is already present).
- Manifests are generated, never hand-edited, from `content/skills/*.yaml` and the live registry, so the repo mirror and the API stay identical.
- All copy stays English-only; illustrative numbers keep their projection labels.
