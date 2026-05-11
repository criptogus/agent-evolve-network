<div align="center">

# Super Agent Skill

**Open registry of Skills, Playbooks, Souls and Guardrails for AI agents — distributed over MCP.**

[Website](https://www.superagentskill.com) · [Marketplace](https://www.superagentskill.com/marketplace) · [Docs](https://www.superagentskill.com/docs) · [MCP endpoint](https://www.superagentskill.com/api/mcp)

</div>

---

Super Agent Skill is two things:

1. **A hosted platform** at [superagentskill.com](https://www.superagentskill.com) that runs the *SkillForge* evolution loop — it scores skills, finds weaknesses, patches them, and serves the best version through MCP to any compatible agent (Claude, Cursor, Codex, Continue, etc.).
2. **An open registry** (this repo) of community-maintained `skills/`, `playbooks/`, `souls/` and `guardrails/`. Anything in `content/` is free to download, fork, remix and embed — under [CC BY-SA 4.0](LICENSES/CONTENT-CC-BY-SA-4.0.txt). The application code is [Apache 2.0](LICENSE).

> **Why open source it?** The MCP improvement loop only matters if there is a thriving catalog to improve. We want the catalog to belong to the community.

## What lives in `content/`

| Folder | What it is | Schema |
| --- | --- | --- |
| [`content/skills/`](content/skills) | A focused capability with a system prompt, rules, examples, and a runnable contract | [`schemas/skill.schema.json`](content/schemas/skill.schema.json) |
| [`content/playbooks/`](content/playbooks) | A multi-step procedure that orchestrates skills/tools to reach an outcome | [`schemas/playbook.schema.json`](content/schemas/playbook.schema.json) |
| [`content/souls/`](content/souls) | A persona/identity bundle — voice, values, defaults — that wraps any agent | [`schemas/soul.schema.json`](content/schemas/soul.schema.json) |
| [`content/guardrails/`](content/guardrails) | Safety, compliance and policy rules attached to a skill or soul | [`schemas/guardrail.schema.json`](content/schemas/guardrail.schema.json) |

Each item is a single self-contained YAML or JSON file. Browse the folders for working examples.

## Use a package

**Download directly** (no account needed):

```bash
curl -O https://raw.githubusercontent.com/<org>/super-agent-skill/main/content/skills/code-reviewer.yaml
```

**Or stream the live, evolving version through MCP** — point your agent at:

```
https://www.superagentskill.com/api/mcp
```

The hosted version is continuously evaluated and patched by SkillForge, so you always get the strongest variant.

## Contribute a package

1. Fork this repo.
2. Copy a template from `content/<type>/_template.yaml` into the same folder and rename it (`my-skill.yaml`).
3. Fill it in. Validate locally:
   ```bash
   bun install
   bun run validate:content
   ```
4. Open a pull request. CI runs the validator, and a maintainer reviews for quality, safety and overlap with existing packages.

Detailed rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Run the platform locally

The app is a TanStack Start + Lovable Cloud project.

```bash
bun install
bun run dev
```

You will need a Lovable Cloud project (Supabase) — see [`supabase/`](supabase) for the schema. The marketplace UI, MCP endpoint, SkillForge loop and admin tools all live in [`src/`](src).

## Roadmap

- [ ] CLI to scaffold and publish packages straight from the terminal
- [ ] Content signing so consumers can verify a package version
- [ ] Versioned releases of the registry as downloadable bundles
- [ ] Public leaderboard for the highest-scoring community packages

## License

- **Code** in this repo: [Apache License 2.0](LICENSE)
- **Content** in `content/`: [Creative Commons Attribution-ShareAlike 4.0](LICENSES/CONTENT-CC-BY-SA-4.0.txt)

By contributing you agree your contribution is licensed under the same terms.
