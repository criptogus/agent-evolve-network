/**
 * Platform version — single source of truth.
 *
 * See docs/VERSIONING.md for the evolution policy. Every shipped update
 * MUST bump this file (patch at minimum) and prepend a CHANGELOG entry.
 *
 * SemVer: MAJOR.MINOR.PATCH
 *  - MAJOR: breaking changes to public APIs, MCP contract, or DB schema
 *  - MINOR: new user-facing feature, new route, new skill category
 *  - PATCH: fixes, copy/UI polish, migrations without breaking changes
 *
 * We are still pre-1.0: rapid evolution, no stability guarantees.
 */

export const PLATFORM_VERSION = "0.1.6" as const;
export const PLATFORM_CODENAME = "Genesis" as const;
export const PLATFORM_STAGE: "alpha" | "beta" | "ga" = "alpha";
export const PLATFORM_BUILD_DATE = "2026-07-06" as const;

export type ChangelogEntry = {
  version: string;
  date: string; // ISO yyyy-mm-dd
  kind: "major" | "minor" | "patch";
  title: string;
  highlights: string[];
};

/**
 * Most-recent-first. Keep in sync with CHANGELOG.md.
 * Every deployed change appends a new entry (or amends the top one before shipping).
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.6",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou compatibilidade MCP",
      "Changes",
      "Changes",
      "Changes",
      "Changes",
    ],
  },
  {
    version: "0.1.5",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Restricted permissive SELECT RLS",
      "Changes",
    ],
  },
  {
    version: "0.1.4",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Changes",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Changes",
      "Changes",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Configurou auto-bump de versão",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-07-06",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Changes",
      "Added public version endpoint",
      "Changes",
      "Changes",
      "Implementou lógica de versioning",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-06",
    kind: "minor",
    title: "Genesis — public evolution log",
    highlights: [
      "Platform versioning becomes a first-class, visible signal",
      "Footer surfaces live version + stage",
      "Evolution policy documented in docs/VERSIONING.md",
    ],
  },
];

export function formatVersionLabel() {
  const stage = PLATFORM_STAGE === "ga" ? "" : ` · ${PLATFORM_STAGE}`;
  return `v${PLATFORM_VERSION}${stage} · ${PLATFORM_CODENAME}`;
}
