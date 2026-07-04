import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_STATS, TOTAL_PACKAGES } from "@/lib/site-stats";

const supabaseAdmin = _supabaseAdmin as any;

export type LiveSiteStats = {
  skills: number;
  playbooks: number;
  souls: number;
  guardrails: number;
  total: number;
  /** True when the numbers came from the live registry, false when the static fallback was used. */
  live: boolean;
};

export const FALLBACK_SITE_STATS: LiveSiteStats = {
  skills: SITE_STATS.skills,
  playbooks: SITE_STATS.playbooks,
  souls: SITE_STATS.souls,
  guardrails: SITE_STATS.guardrails,
  total: TOTAL_PACKAGES,
  live: false,
};

async function countByType(type: string): Promise<number | null> {
  const { count, error } = await supabaseAdmin
    .from("packages")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("review_status", "approved")
    .eq("type", type);
  if (error) return null;
  return count ?? 0;
}

/**
 * Counts published + approved packages by type in the live registry.
 * Falls back to the static SITE_STATS constants on any error, so callers
 * (loaders, head() builders) can rely on it never throwing.
 */
export async function fetchLiveSiteStats(): Promise<LiveSiteStats> {
  try {
    const [skills, playbooks, souls, guardrails] = await Promise.all([
      countByType("skill"),
      countByType("playbook"),
      countByType("soul"),
      countByType("guardrail"),
    ]);
    if (skills === null || playbooks === null || souls === null || guardrails === null) {
      return FALLBACK_SITE_STATS;
    }
    // A near-empty result usually means a misconfigured env, not an empty registry.
    if (skills + playbooks + souls + guardrails === 0) return FALLBACK_SITE_STATS;
    return {
      skills,
      playbooks,
      souls,
      guardrails,
      total: skills + playbooks + souls + guardrails,
      live: true,
    };
  } catch (e) {
    console.error("[site-stats] falling back to static stats:", e);
    return FALLBACK_SITE_STATS;
  }
}

/** Loader-friendly server function: `const stats = await getLiveSiteStats()`. */
export const getLiveSiteStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveSiteStats> => fetchLiveSiteStats(),
);
