# super-agent

Plug-and-play CLI for Super Agent Skill: install skill packages locally **and**
get a fully authenticated MCP connection in one command.

## Connect an MCP client (OAuth, zero JSON editing)

```bash
npx super-agent connect --client claude-code
# logs in via your browser (loopback PKCE), then wires the client for you
```

`connect` runs the full OAuth flow (dynamic client registration → PKCE →
browser consent → token exchange), stores the token in
`~/.superagentskill/credentials.json` (chmod 600), and writes/patches the
target client's MCP config so even the auth-gated write tools work.

Supported clients: `claude-code`, `claude` (Desktop), `cursor`, `codex`,
`vscode`, `windsurf`.

```bash
npx super-agent login            # OAuth only
npx super-agent status           # show login state / token expiry
npx super-agent logout           # revoke + forget the token
npx super-agent setup cursor     # (re)write a client config from saved creds
npx super-agent mcp              # local stdio <-> remote HTTP MCP bridge
```

### The local bridge

`super-agent mcp` is a stdio MCP server that proxies to
`https://superagentskill.com/api/mcp`, injecting your OAuth token and
auto-refreshing it. Point any stdio-only client at it:

```jsonc
{ "mcpServers": { "super-agent-skill": { "command": "npx", "args": ["-y", "super-agent", "mcp"] } } }
```

This is what makes the connection truly plug and play for clients whose MCP
OAuth support is flaky or absent — auth is handled entirely by the CLI.

## Install skill packages

```bash
npx super-agent install code-reviewer
# → .claude/skills/code-reviewer/SKILL.md
# → .cursor/rules/code-reviewer.mdc
# → .continue/skills/code-reviewer.md
# → .cline/skills/code-reviewer.md

npx super-agent install <slug> [--target claude|cursor|continue|cline|all]
npx super-agent list   [--query <q>]
npx super-agent search <q>
npx super-agent info   <slug>
```

## Env

- `SUPER_AGENT_REGISTRY` — override registry origin (default `https://superagentskill.com`)
- `SUPER_AGENT_TELEMETRY=0` — disable anonymized install telemetry

## Why use it

- **One command** to a working, authenticated MCP connection — no hand-edited JSON.
- **No login** needed for public skill packages; OAuth only when you want write tools.
- **Cross-IDE** — installs to every agent you use, with a token-injecting bridge fallback.
