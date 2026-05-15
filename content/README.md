# `content/` — the open registry

Everything in this folder is **CC BY-SA 4.0** and free to download, fork or remix.

## Layout

```
content/
├── skills/         # Single capabilities with a contract
├── playbooks/      # Multi-step workflows
├── souls/          # Personas / value systems
├── guardrails/     # Safety, compliance, policy rules
└── schemas/        # JSON Schemas every package validates against
```

Each package is a single YAML file. Filename = `<slug>.yaml`.

## Adding a package

1. Copy the matching `_template.yaml` into the same folder and rename it.
2. Fill it in — see [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the quality bar.
3. Validate locally:
   ```bash
   bun run validate:content
   ```
4. Open a PR using the **Package submission** template.

## Using a package outside this repo

```bash
# raw download
curl -O https://raw.githubusercontent.com/criptogus/agent-evolve-network/main/content/skills/code-reviewer.yaml

# or stream the live, evolving version through MCP
# https://superagentskill.com/api/mcp
```
