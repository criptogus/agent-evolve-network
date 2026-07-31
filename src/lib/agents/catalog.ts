import type { AgentDef, AgentSummary } from "./types";
import { toSummary } from "./types";
import { executiveAgents } from "./catalog/executive";
import { specialistAgents } from "./catalog/specialist";
import { adsAgents } from "./catalog/ads";
import { contentAgents } from "./catalog/content";
import { leadershipAgents } from "./catalog/leadership";
import { gtmAgents } from "./catalog/gtm";
import { operationsAgents } from "./catalog/operations";
import { riskFinanceAgents } from "./catalog/risk-finance";

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

export type { AgentDef, AgentSummary, AgentDoc } from "./types";
