# Skills ecosystem (skills.sh) compatibility + messaging

## Compatibility verdict

We are compatible, and the gap is small.

Vercel's `skills` CLI (`npx skills add <owner/repo>`) installs skill packages from a public GitHub
repo laid out as `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`), and writes
them into whichever agent the developer uses (Claude Code, Cursor, Codex, Copilot, Windsurf, Gemini,
Cline, OpenCode, Zed, and ~10 more).

What we already have:
- Every published package can already be served as a spec-correct `SKILL.md`
  (`/api/skills/<slug>/export.md`, built by our Anthropic-strict serializer).
- 105 skills in `content/skills/*.yaml` as the source of truth.
- Our own installer (`npx super-agent install <slug>`) and the MCP server.

What is missing for `npx skills add` to work today: the repo has no top-level `skills/` directory in
the layout the CLI expects.

## What we will build

### 1. `skills/` mirror in this repo (makes us installable by `npx skills add`)

- New script `scripts/build-skills-sh-mirror.mjs`: reads every `content/skills/*.yaml`
  (skipping `_template.yaml`) and writes `skills/<slug>/SKILL.md` — frontmatter (`name`,
  `description` with WHAT + WHEN triggers, `license`, `version`, `homepage` pointing at our
  marketplace page) plus body assembled from system prompt, rules (must / must not), examples and a
  Trust Score line linking to the skill's public trust page.
- `skills/README.md` explaining the mirror, the install one-liner, and that the canonical, always
  current source is our marketplace + MCP.
- Wire it into `scripts/validate-content.mjs`'s sibling npm scripts (`npm run build:skills-mirror`)
  and into the existing release workflow so the mirror regenerates whenever content changes, keeping
  it from drifting.
- Install string for the whole catalog: `npx skills add criptogus/agent-evolve-network`.

### 2. Landing page section — "Works with the open Skills ecosystem"

New section on `src/routes/index.tsx`, placed after the install/lab narrative:
- Headline: install our skills any way your agent prefers — `skills.sh` CLI, our CLI, or MCP.
- Copyable one-liner `npx skills add criptogus/agent-evolve-network`.
- Row of supported agents (Claude Code, Cursor, Codex, Copilot, Windsurf, Gemini, Cline, Zed,
  OpenCode, and more) rendered as text/icon chips in our own look and feel (no third-party logo
  files fetched).
- One differentiator line, which is the real message: the open ecosystem gives you distribution;
  SAK adds the Trust Score, adversarial testing and before/after proof, so you know a skill is worth
  installing. No dismissive claims about skills.sh.

### 3. Marketplace + package pages

- `src/routes/marketplace.$packageId.tsx`: in the Install tab and the quick-install block, add a
  third copyable command next to the existing ones —
  `npx skills add criptogus/agent-evolve-network/<slug>` — labelled "Open Skills CLI (skills.sh)".
- `src/routes/marketplace.index.tsx`: one compact compatibility line under the page header stating
  every listed skill installs through the open Skills CLI, our CLI, or MCP.

### 4. Docs, how-it-works, welcome

- `src/routes/docs.tsx`: new "Install with the open Skills CLI" block with the commands
  (`add`, `update`) and a short compatibility matrix: open Skills CLI / `SKILL.md` standard / MCP /
  `super-agent` CLI, and which surfaces support graded Trust Scores and telemetry.
- `src/routes/how-it-works.tsx`: add the skills.sh path as a first-class install route in the
  existing step where install options are described.
- `src/routes/welcome.tsx`: add the `npx skills add …` command to the quick-copy strip so a new user
  can adopt the catalog without configuring MCP first.

### 5. SEO / metadata

Update the `head()` description of the touched routes to mention open Skills ecosystem
compatibility, so search and agent crawlers pick it up. `/llms.txt` and `/agents.md` also get a line
declaring the `npx skills add` entry point, since agents read those first.

## Technical notes

- The mirror is generated from `content/skills/*.yaml`, not from the database, so the repo stays
  reproducible and the CI validation already in place (`validate-content`) keeps frontmatter honest.
  The live database export endpoint remains the canonical path for skills authored through the app.
- Frontmatter passes our existing Anthropic-spec validator (kebab-case slug, ≤1024-char description
  with trigger phrases, no angle brackets), which is the same shape skills.sh consumes.
- No database changes, no new secrets, no dependency added.
- Agent chips are plain components with our tokens — no external image hotlinking.
