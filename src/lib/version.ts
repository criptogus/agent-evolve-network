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

export const PLATFORM_VERSION = "0.1.19" as const;
export const PLATFORM_CODENAME = "Genesis" as const;
export const PLATFORM_STAGE: "alpha" | "beta" | "ga" = "alpha";
export const PLATFORM_BUILD_DATE = "2026-07-29" as const;

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
    version: "0.1.19",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.18",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.17",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Verificou status do domínio de email",
      "Work in progress",
    ],
  },
  {
    version: "0.1.16",
    date: "2026-07-15",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Set up email infrastructure",
    ],
  },
  {
    version: "0.1.15",
    date: "2026-07-15",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Set up email infrastructure",
    ],
  },
  {
    version: "0.1.14",
    date: "2026-07-15",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed security scan issues",
    ],
  },
  {
    version: "0.1.13",
    date: "2026-07-15",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Lovable update",
      "Work in progress",
    ],
  },
  {
    version: "0.1.12",
    date: "2026-07-14",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed referral data access",
    ],
  },
  {
    version: "0.1.11",
    date: "2026-07-14",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou detecção de bots",
    ],
  },
  {
    version: "0.1.10",
    date: "2026-07-14",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.9",
    date: "2026-07-14",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Instrumentou funil de eventos",
    ],
  },
  {
    version: "0.1.8",
    date: "2026-07-14",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed credit trigger SQL error",
      "Work in progress",
    ],
  },
  {
    version: "0.1.7",
    date: "2026-07-12",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed changelog quality",
    ],
  },
  {
    version: "0.1.6",
    date: "2026-07-06",
    kind: "patch",
    title: "MCP compatibility polish",
    highlights: [
      "Added MCP compatibility improvements across clients (Hermes, Cursor, Claude, Codex, VS Code).",
      "Surfaced universal compatibility on the landing page.",
    ],
  },
  {
    version: "0.1.5",
    date: "2026-07-06",
    kind: "patch",
    title: "RLS hardening",
    highlights: [
      "Restricted overly permissive SELECT policies on trust, metrics, and release tables.",
    ],
  },
  {
    version: "0.1.4",
    date: "2026-07-06",
    kind: "patch",
    title: "Public catalog fixes",
    highlights: [
      "Fixed anonymous access to the public package catalog and certified badge SVGs.",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-07-06",
    kind: "patch",
    title: "Trust score reliability",
    highlights: [
      "Fixed trust score lookup errors affecting marketplace listings and the get_skill_trust MCP tool.",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-07-06",
    kind: "patch",
    title: "Automated version bumping",
    highlights: [
      "Configured CI to auto-bump the platform version and update the changelog on every deploy.",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-07-06",
    kind: "patch",
    title: "Public version endpoint",
    highlights: [
      "Added a public GET /api/public/version endpoint returning version, stage, codename, and build date.",
      "Implemented the platform versioning logic and single source of truth.",
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
