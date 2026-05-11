# Contributing to Super Agent Skill

Thanks for wanting to make agents smarter. There are three kinds of contributions we love:

1. **New packages** — a skill, playbook, soul or guardrail in `content/`.
2. **Improvements to existing packages** — better prompts, tighter rules, more examples, fixed edge cases.
3. **Code & docs** for the platform itself (in `src/`).

By submitting a contribution you agree to license your work under the project's licenses (Apache 2.0 for code, CC BY-SA 4.0 for content).

## Contributing a package

### 1. Pick the right type

| You want to... | Use |
| --- | --- |
| Encapsulate a single capability with a contract (input → output) | **Skill** |
| Codify a multi-step workflow that calls skills/tools in sequence | **Playbook** |
| Define a persona, voice and value system for an agent | **Soul** |
| Add safety, compliance or policy rules | **Guardrail** |

### 2. Copy the template

```bash
cp content/skills/_template.yaml content/skills/my-skill.yaml
```

Templates live next to the examples in each folder.

### 3. Fill it in — quality bar

A package will only be accepted if it:

- Has a clear, scoped purpose (do one thing well — split it if it doesn't fit on a page).
- Includes **at least 2 worked examples** with realistic input and the exact expected output.
- States `must` and `must_not` rules explicitly.
- Uses a unique kebab-case `slug` not already in the registry.
- Is original work, public-domain, or properly attributed.
- Contains no secrets, PII, or copyrighted prompts pulled from a paid product.

### 4. Validate

```bash
bun install
bun run validate:content
```

The validator checks the schema, slug uniqueness and example count. CI runs the same script on your PR.

### 5. Open a pull request

Use the **Package submission** PR template. A maintainer will review for quality, safety and overlap. Accepted packages are imported into the hosted registry on the next sync, where SkillForge starts evolving them.

## Improving an existing package

- Open an issue first if the change is structural (rename, breaking rules, etc.).
- For prompt tweaks and new examples, just open a PR.
- Bump the package's `version` field following semver.
- Note the change in the PR description — what got better and how you tested it.

## Code contributions

- Match existing style (Prettier + ESLint).
- Keep changes focused — one concern per PR.
- For non-trivial changes, open an issue first to align on direction.

## Reporting issues

- **Bug or content problem:** use the matching issue template.
- **Security vulnerability:** see [SECURITY.md](SECURITY.md) — please do **not** open a public issue.

## Code of Conduct

All participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
