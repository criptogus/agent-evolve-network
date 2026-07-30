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

export const PLATFORM_VERSION = "0.1.58" as const;
export const PLATFORM_CODENAME = "Genesis" as const;
export const PLATFORM_STAGE: "alpha" | "beta" | "ga" = "alpha";
export const PLATFORM_BUILD_DATE = "2026-07-30" as const;

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
    version: "0.1.58",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Regenerate package-lock.json again (main gained deps without lock update)",
      "Stabilize language detection and publish the pillar scoring formula",
    ],
  },
  {
    version: "0.1.57",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Update plan",
    ],
  },
  {
    version: "0.1.56",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Changed hero CTA copy",
    ],
  },
  {
    version: "0.1.55",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou User-Agent nos docs",
    ],
  },
  {
    version: "0.1.54",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed hanging Worker guard",
    ],
  },
  {
    version: "0.1.53",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Atualizou URL oficial para MCP",
    ],
  },
  {
    version: "0.1.52",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Updated Vite plugin to 1.49.0",
    ],
  },
  {
    version: "0.1.51",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed referral_code access",
    ],
  },
  {
    version: "0.1.50",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Address client integration feedback: upload validation, honest partial scores, PT detection, JSON review API",
      "Grade reference-format skills with their own rubric, not the procedural one",
    ],
  },
  {
    version: "0.1.49",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.48",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.47",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Corrigiu pipeline upload_packages",
    ],
  },
  {
    version: "0.1.46",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Corrigiu endpoint JSON e det. idioma",
    ],
  },
  {
    version: "0.1.45",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Criou endpoint MCP espelho",
    ],
  },
  {
    version: "0.1.44",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.43",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Fixed security findings",
    ],
  },
  {
    version: "0.1.42",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Aplicou migrations no banco",
    ],
  },
  {
    version: "0.1.41",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Criou NDA online para contas pagas",
    ],
  },
  {
    version: "0.1.40",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou criptografia por tenant",
    ],
  },
  {
    version: "0.1.39",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Regenerate package-lock.json to fix npm ci in CI",
    ],
  },
  {
    version: "0.1.38",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Add paired-benchmark pipeline so landing metrics become measured, not asserted",
    ],
  },
  {
    version: "0.1.37",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.36",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Added cinematic chart animations",
    ],
  },
  {
    version: "0.1.35",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.34",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou tooltips de métricas",
      "Adicionou colunas lado a lado",
      "Adicionou gráfico de outcome no hero",
      "Make README and CONTRIBUTING more compelling for new contributors",
    ],
  },
  {
    version: "0.1.33",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Destacou seção A-grade",
      "Work in progress",
    ],
  },
  {
    version: "0.1.32",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou métricas de outcome ao ROI",
      "Work in progress",
    ],
  },
  {
    version: "0.1.31",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Add comparative value charts to the landing A-grade section",
    ],
  },
  {
    version: "0.1.30",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou telemetria e ROI",
    ],
  },
  {
    version: "0.1.29",
    date: "2026-07-30",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Updated eval docs and SAK",
      "Work in progress",
    ],
  },
  {
    version: "0.1.28",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Addressed security issues from scan",
      "Work in progress",
    ],
  },
  {
    version: "0.1.27",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.26",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Priorizou bugs críticos de funil",
      "Added docs panel to clients",
    ],
  },
  {
    version: "0.1.25",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Adicionou QuickCopy no Welcome",
    ],
  },
  {
    version: "0.1.24",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Work in progress",
    ],
  },
  {
    version: "0.1.23",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.22",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Destacou agentes em /welcome",
    ],
  },
  {
    version: "0.1.21",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Housekeeping and minor improvements.",
    ],
  },
  {
    version: "0.1.20",
    date: "2026-07-29",
    kind: "patch",
    title: "Maintenance release",
    highlights: [
      "Removed Discord link from index",
    ],
  },
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
