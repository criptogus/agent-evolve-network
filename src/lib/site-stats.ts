/**
 * Single source of truth for registry stats quoted in marketing copy
 * (home, pricing, welcome, README badges, OG descriptions).
 *
 * Update the numbers HERE ONLY — never hardcode counts in components.
 * Ideally these get replaced by a server function that counts the live
 * registry; until then, keep them in sync with the hosted registry.
 */
export const SITE_STATS = {
  skills: 459,
  playbooks: 32,
  souls: 69,
  guardrails: 50,
  /** Seconds to connect via MCP — used in "setup time" claims. */
  mcpSetupSeconds: 30,
} as const;

export const TOTAL_PACKAGES =
  SITE_STATS.skills + SITE_STATS.playbooks + SITE_STATS.souls + SITE_STATS.guardrails;

/** "459+" */
export const SKILLS_LABEL = `${SITE_STATS.skills}+`;

/** "600+" — total packages rounded down to the nearest 50 for stable copy. */
export const PACKAGES_LABEL = `${Math.floor(TOTAL_PACKAGES / 50) * 50}+`;
