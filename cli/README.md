# super-agent

One-line installer for Super Agent Skill packages. Drops the right files
into your project so Claude Code, Cursor, Continue, or Cline picks the
skill up automatically.

```bash
npx super-agent install code-reviewer
# → .claude/skills/code-reviewer/SKILL.md
# → .cursor/rules/code-reviewer.mdc
# → .continue/skills/code-reviewer.md
# → .cline/skills/code-reviewer.md
```

## Commands

```bash
npx super-agent install <slug> [--target claude|cursor|continue|cline|all]
npx super-agent list   [--query <q>]
npx super-agent search <q>
npx super-agent info   <slug>
```

## Env

- `SUPER_AGENT_REGISTRY` — override registry origin (default `https://superagentskill.com`)
- `SUPER_AGENT_TELEMETRY=0` — disable anonymized install telemetry

## Why use it

- **No login** for public packages — pulls straight from the public registry.
- **Trust signal** — every package comes with a verifiable Trust Score badge
  (`/api/badges/trust/<slug>.svg`).
- **Cross-IDE** — one command installs to every agent you use.
