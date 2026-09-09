# Super Agent Skill: Architecture Analysis & Evolution Roadmap

## 1. Current Architecture Overview

Super Agent Skill is a platform for distributing AI agent capabilities (skills, playbooks, souls, guardrails) with a strong emphasis on security, adversarial robustness, and trust scoring.

### Core Stack
- **Frontend & API:** TanStack Start, React 19, Tailwind CSS v4, Radix UI. It acts as both the marketing site, the user dashboard, and hosts the public/private APIs.
- **Database:** Supabase (PostgreSQL) handling data storage, Row Level Security (RLS), and full-text search (`search_vector` with `tsvector`).
- **Distribution:**
  - **MCP (Model Context Protocol):** Provides a standard API for AI assistants to discover and install packages.
  - **CLI (`packages/cli`):** A Node.js CLI tool (`super-agent.mjs`) to install skills directly.
  - **File downloads:** YAML manifests directly available.
- **Content:** The `content/` directory contains the "open seed" of YAML files describing skills.
- **Evaluation Engine (SkillForge):** Custom adversarial harness scripts (in `scripts/`) to test skills against prompt injection, data exfiltration, policy bypass, etc.
- **Tests:** A custom plain Node test runner (`node --test`) testing both adversarial scripts and site functionality.

### Strengths
1. **Security-First Approach:** Deep integration of adversarial testing (injection, role hijack, data leaks).
2. **Trust Architecture:** Cryptographic signing of packages and attestations, providing verifiable offline trust.
3. **Distribution Agnostic:** Support for MCP, CLI, and raw files gives great flexibility to end-users.
4. **Modern Stack:** TanStack Start and React 19 provide a solid, fast SSR foundation.

---

## 2. Identified Areas for Improvement & Evolution

### A. Codebase & Tooling Standardization
- **Script Migration:** The `scripts/` directory contains a mix of `.mjs` scripts (e.g., `audit-skills.mjs`, `eval-adversarial.mjs`). Migrating these to TypeScript would improve type safety, maintainability, and alignment with the main app code.
- **Monorepo Structure:** The `packages/cli` is partially separated but still relies on root dependencies. Formalizing a monorepo structure (e.g., using Turborepo or npm workspaces) for `web`, `cli`, and `core` packages would improve dependency management.
- **Test Framework:** The current Node.js built-in test runner (`node --test`) works, but migrating to Vitest would provide better integration with Vite/TanStack Start, better mocking, and UI for tests.

### B. Security & Integrity Enhancements
- **End-to-End Test Automation:** Implement Playwright/Cypress tests for critical user flows (OAuth login, package upload, CLI interaction).
- **Automated Signature Rotation:** Implement automated key rotation and revocation lists for package signatures.
- **Vector Search Tuning:** The `tsvector` search is currently basic. Integrating pgvector for semantic search over skill descriptions would significantly improve the discovery experience in the marketplace.

### C. Developer & Author Experience (SkillForge)
- **CLI Expansion:** Implement the planned `sas init`, `sas publish`, and `sas eval` commands in the CLI to allow authors to build and test locally before uploading.
- **Versioned Bundles:** Build out the versioned downloadable registry bundles mentioned in the roadmap.
- **Curated Collections:** Implement the UI and data model for community-curated bundles around specific use cases.

### D. Architecture Scalability
- **Evaluation Queueing:** The adversarial evaluation (`eval-adversarial.mjs`) seems to run synchronously or in basic scripts. As the registry grows, moving this to a robust background job queue (e.g., BullMQ or temporal.io) is critical.
- **Caching Layer:** The API and SSR currently rely on Cloudflare/Vite caches. Introducing Redis for aggressive caching of trust scores and package metadata could reduce DB load.

## 3. Recommended Next Steps (Short-term)
1. **Implement `pgvector` for Semantic Search:** Enhance the marketplace discovery.
2. **Migrate `.mjs` Scripts to TypeScript:** Reduce technical debt in the build and eval pipelines.
3. **Flesh out the CLI:** Add `init` and `publish` commands for developers.
