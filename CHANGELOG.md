# Changelog

All notable changes to this project are documented here. The platform
follows the evolution policy in [`docs/VERSIONING.md`](docs/VERSIONING.md)
and uses [Semantic Versioning](https://semver.org/) (pre-1.0, alpha stage).

Component artifacts are versioned and released independently via git tags:

- **Content marketplace** — `content-v*` tags publish a GitHub Release with
  per-category bundles and an auto-generated changelog.
- **`super-agent` CLI** — `cli-v*` tags publish cross-platform binaries.
- **`@superagentskill/sdk`** — versioned in `packages/sdk-ts/package.json`.

## [0.1.5] — 2026-07-06 — *Genesis* (alpha) — Maintenance release

### Changed

- Restricted permissive SELECT RLS
- Changes

## [0.1.4] — 2026-07-06 — *Genesis* (alpha) — Maintenance release

### Changed

- Changes

## [0.1.3] — 2026-07-06 — *Genesis* (alpha) — Maintenance release

### Changed

- Changes
- Changes

## [0.1.2] — 2026-07-06 — *Genesis* (alpha) — Maintenance release

### Changed

- Configurou auto-bump de versão

## [0.1.1] — 2026-07-06 — *Genesis* (alpha) — Maintenance release

### Changed

- Changes
- Added public version endpoint
- Changes
- Changes
- Implementou lógica de versioning

## [0.1.0] — 2026-07-06 — *Genesis* (alpha)

### Added

- Platform versioning becomes a first-class, visible signal — the footer
  now renders the live version, stage, and codename from
  `src/lib/version.ts`.
- Evolution policy documented in `docs/VERSIONING.md` (SemVer, stages,
  codenames, shipping checklist).

> Historical entries below predate the platform-wide versioning policy and
> refer to the content marketplace release line (`content-v*` tags).

## [content-v1.0.0] — 2026-05-30

First tagged marketplace release. Marks the content marketplace as stable
and establishes public versioning across the CLI and SDK.

### Added

- **NVIDIA SkillSpector integration** — a complementary, advisory security scan
  layered on top of the curated `audit:skills` gate. Renders each package to a
  `SKILL.md`, runs SkillSpector's static analysis, and uploads SARIF findings to
  the repo's Security tab (`npm run scan:skillspector`).
- **24 finance skills** sourced and adapted from `himself65/finance-skills`.
- **`social-media-pro-max`** skill pack (viral content + design intelligence).
- Marketplace now ships **104 skills, 6 souls, 4 integrations, 2 playbooks, and
  2 guardrails**.

### Changed

- CLI `super-agent` bumped to **0.3.0**.
- SDK `@superagentskill/sdk` bumped to **0.2.0**.

### Security

- Layered scanning model documented in `SECURITY.md` and `CONTRIBUTING.md`:
  schema validation → `audit:skills` (blocking) → SkillSpector (advisory).
- Resolved outbound-URL findings flagged by `audit:skills` in the finance skills.

[content-v1.0.0]: https://github.com/criptogus/agent-evolve-network/releases/tag/content-v1.0.0
