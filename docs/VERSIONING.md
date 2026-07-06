# Versioning & Evolution Policy

Super Agent Skill evolves constantly. Every shipped change is visible: users
see a live version stamp in the footer and can inspect the full changelog.
This document defines the rules so the version number stays honest.

## 1. Single source of truth

- `src/lib/version.ts` — `PLATFORM_VERSION`, `PLATFORM_CODENAME`,
  `PLATFORM_STAGE`, `PLATFORM_BUILD_DATE`, and the `CHANGELOG` array.
- `CHANGELOG.md` — human-readable mirror at repo root.
- `package.json` `version` — matches `PLATFORM_VERSION`.

If any of the three disagree, `src/lib/version.ts` wins and the others must
be updated in the same commit.

## 2. Scheme — SemVer, pre-1.0

Format: `MAJOR.MINOR.PATCH` (`0.1.0`, `0.1.1`, `0.2.0`, ...).

While `MAJOR = 0` we are in the **initial evolution phase**: minor bumps may
carry breaking changes, and no long-term stability is promised. We reach
`1.0.0` only when the MCP contract, DB schema, and public REST/API surface
are declared stable.

| Bump  | When to use                                                                 |
| ----- | --------------------------------------------------------------------------- |
| PATCH | Bug fix, copy tweak, RLS/migration fix, dependency bump, small UI polish    |
| MINOR | New route, new user-facing feature, new skill/soul category, new integration|
| MAJOR | Breaking change to MCP tools, public REST API, DB schema, or SDK signatures |

**Rule of thumb:** if the user can notice the change, bump at least MINOR.
If nothing user-visible changed, bump PATCH. Never ship without a bump.

## 3. Stages

`PLATFORM_STAGE` is one of:

- `alpha` — pre-1.0, rapid iteration (current)
- `beta` — feature-complete for a milestone, hardening
- `ga` — general availability, stability guarantees apply

The stage is rendered next to the version in the footer, except at `ga`.

## 4. Codenames

Each MINOR line gets a codename (`0.1.x` = *Genesis*). Codenames are set
once per minor line and carried through its patches. They're a small signal
that the platform has personality and momentum.

## 5. Shipping checklist

Every PR that changes user-visible behavior MUST:

1. Update `PLATFORM_VERSION` and `PLATFORM_BUILD_DATE` in `src/lib/version.ts`.
2. Prepend an entry to `CHANGELOG` in the same file (most-recent-first).
3. Mirror the entry into `CHANGELOG.md`.
4. Bump `package.json` `version` to match.

A CI check may enforce this later; for now it's on the author and reviewer.

## 6. Surfacing evolution to users

- **Footer** — `formatVersionLabel()` from `src/lib/version.ts`.
- **Changelog page** *(planned)* — renders the `CHANGELOG` array.
- **`/status`** — may show current version and last deploy timestamp.

The intent is simple: a visitor returning next week should see a different
version number and, if curious, a real list of what changed.
