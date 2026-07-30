# Changelog

All notable changes to this project are documented here. The platform
follows the evolution policy in [`docs/VERSIONING.md`](docs/VERSIONING.md)
and uses [Semantic Versioning](https://semver.org/) (pre-1.0, alpha stage).

Component artifacts are versioned and released independently via git tags:

- **Content marketplace** — `content-v*` tags publish a GitHub Release with
  per-category bundles and an auto-generated changelog.
- **`super-agent` CLI** — `cli-v*` tags publish cross-platform binaries.
- **`@superagentskill/sdk`** — versioned in `packages/sdk-ts/package.json`.

## [0.1.32] — 2026-07-30 — *Genesis* (alpha) — Maintenance release

### Changed

- Adicionou métricas de outcome ao ROI
- Work in progress

## [0.1.31] — 2026-07-30 — *Genesis* (alpha) — Maintenance release

### Changed

- Add comparative value charts to the landing A-grade section

## [0.1.30] — 2026-07-30 — *Genesis* (alpha) — Maintenance release

### Changed

- Adicionou telemetria e ROI

## [0.1.29] — 2026-07-30 — *Genesis* (alpha) — Maintenance release

### Changed

- Updated eval docs and SAK
- Work in progress

## [0.1.28] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Addressed security issues from scan
- Work in progress

## [0.1.27] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.26] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Priorizou bugs críticos de funil
- Added docs panel to clients

## [0.1.25] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Adicionou QuickCopy no Welcome

## [0.1.24] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Work in progress

## [0.1.23] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.22] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Destacou agentes em /welcome

## [0.1.21] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.20] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Removed Discord link from index

## [0.1.19] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.18] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.17] — 2026-07-29 — *Genesis* (alpha) — Maintenance release

### Changed

- Verificou status do domínio de email
- Work in progress

## [0.1.16] — 2026-07-15 — *Genesis* (alpha) — Maintenance release

### Changed

- Set up email infrastructure

## [0.1.15] — 2026-07-15 — *Genesis* (alpha) — Maintenance release

### Changed

- Set up email infrastructure

## [0.1.14] — 2026-07-15 — *Genesis* (alpha) — Maintenance release

### Changed

- Fixed security scan issues

## [0.1.13] — 2026-07-15 — *Genesis* (alpha) — Maintenance release

### Changed

- Lovable update
- Work in progress

## [0.1.12] — 2026-07-14 — *Genesis* (alpha) — Maintenance release

### Changed

- Fixed referral data access

## [0.1.11] — 2026-07-14 — *Genesis* (alpha) — Maintenance release

### Changed

- Adicionou detecção de bots

## [0.1.10] — 2026-07-14 — *Genesis* (alpha) — Maintenance release

### Changed

- Housekeeping and minor improvements.

## [0.1.9] — 2026-07-14 — *Genesis* (alpha) — Maintenance release

### Changed

- Instrumentou funil de eventos

## [0.1.8] — 2026-07-14 — *Genesis* (alpha) — Maintenance release

### Changed

- Fixed credit trigger SQL error
- Work in progress

## [0.1.7] — 2026-07-12 — *Genesis* (alpha) — Maintenance release

### Changed

- Fixed changelog quality

## [0.1.6] — 2026-07-06 — *Genesis* (alpha) — MCP compatibility polish

### Changed

- Added MCP compatibility improvements across clients (Hermes, Cursor, Claude, Codex, VS Code).
- Surfaced universal compatibility on the landing page.

## [0.1.5] — 2026-07-06 — *Genesis* (alpha) — RLS hardening

### Changed

- Restricted overly permissive SELECT policies on trust, metrics, and release tables.

## [0.1.4] — 2026-07-06 — *Genesis* (alpha) — Public catalog fixes

### Changed

- Fixed anonymous access to the public package catalog and certified badge SVGs.

## [0.1.3] — 2026-07-06 — *Genesis* (alpha) — Trust score reliability

### Changed

- Fixed trust score lookup errors affecting marketplace listings and the get_skill_trust MCP tool.

## [0.1.2] — 2026-07-06 — *Genesis* (alpha) — Automated version bumping

### Changed

- Configured CI to auto-bump the platform version and update the changelog on every deploy.

## [0.1.1] — 2026-07-06 — *Genesis* (alpha) — Public version endpoint

### Changed

- Added a public GET /api/public/version endpoint returning version, stage, codename, and build date.
- Implemented the platform versioning logic and single source of truth.

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
