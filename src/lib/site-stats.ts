/**
 * Single source of truth for the public-facing counts.
 *
 * Before this existed the landing quoted 459, 4,200, 4,000, 4,218, 590 and
 * "91k agents / 12.4M upgrades" on the same page — for a product whose entire
 * pitch is verifiable trust, inconsistent numbers read as fabricated and cost
 * conversions. Update here, everywhere stays consistent.
 */
export const STATS = {
  skills: 459,
  souls: 69,
  playbooks: 32,
  /** Catch-all registry size used in prose ("459+ skills" style copy). */
  registryTotal: 590,
} as const;

export const STATS_LABEL = {
  skills: `${STATS.skills}+`,
  souls: `${STATS.souls}+`,
  playbooks: `${STATS.playbooks}+`,
  registryTotal: `${STATS.registryTotal}+`,
} as const;
