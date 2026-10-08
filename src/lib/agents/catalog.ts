import type { AgentDef, AgentSummary } from "./types.ts";
import { toSummary } from "./types.ts";
import { executiveAgents } from "./catalog/executive.ts";
import { specialistAgents } from "./catalog/specialist.ts";
import { adsAgents } from "./catalog/ads.ts";
import { contentAgents } from "./catalog/content.ts";
import { leadershipAgents } from "./catalog/leadership.ts";
import { gtmAgents } from "./catalog/gtm.ts";
import { operationsAgents } from "./catalog/operations.ts";
import { riskFinanceAgents } from "./catalog/risk-finance.ts";

/** Curated Agent Store catalog. Versioned in the repo, reviewed like code. */
export const AGENTS: AgentDef[] = [
  ...executiveAgents,
  ...specialistAgents,
  ...adsAgents,
  ...contentAgents,
  ...leadershipAgents,
  ...gtmAgents,
  ...operationsAgents,
  ...riskFinanceAgents,
];

export const AGENT_CATALOG_VERSION = "1.1.0";

export function listAgentSummaries(): AgentSummary[] {
  return AGENTS.map(toSummary);
}

export function findAgent(slug: string): AgentDef | null {
  return AGENTS.find((a) => a.slug === slug) ?? null;
}

export type { AgentDef, AgentSummary, AgentDoc } from "./types.ts";
