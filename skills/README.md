# SAK skills — open Skills CLI mirror

This directory is a generated mirror of the Super Agent Skill (SAK) catalog in the layout the open
Skills CLI expects (https://skills.sh).

Install the whole catalog into any supported agent:

```bash
npx skills add criptogus/agent-evolve-network
```

Install one skill:

```bash
npx skills add criptogus/agent-evolve-network/<skill-name>
```

Update later:

```bash
npx skills update
```

125 skills are mirrored here. Candidate skills include their validation fixtures and
do not claim model-specific certification. Published registry skills expose available evidence at
https://superagentskill.com/marketplace/trust/<skill-name>.

## Source of truth

Do not edit files in this directory. They are generated from `content/skills/*.yaml` by
`scripts/build-skills-sh-mirror.ts` (`npm run build:skills-mirror`). Skills authored inside the
app are served live from https://superagentskill.com/api/skills/<slug>/export.md and through the MCP server at
https://superagentskill.com/api/mcp, which always returns the current graded version plus telemetry.
