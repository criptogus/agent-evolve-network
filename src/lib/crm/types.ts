/** Pure CRM types shared by server, email templates and UI. */
import type { CrmCustomerRow, CrmStage, Opportunity } from "@/lib/crm/segments";

export type CrmRoi = {
  improved_docs: number;
  reviewed_docs: number;
  points_gained: number;
  monthly_usd_saved: number;
  annual_usd_saved: number;
  rescued_runs_per_month: number;
  engineer_hours_saved_per_month: number;
  tokens_saved_per_month: number;
  best: {
    name: string;
    before: number;
    after: number;
    grade_before: string;
    grade_after: string;
  } | null;
  /** additional money still on the table if every doc reached grade A */
  headroom_monthly_usd: number;
  latest_score: number | null;
  latest_grade: string | null;
};

export type CrmUsage = {
  reviews: number;
  uploads: number;
  agents: number;
  diagnoses: number;
  residencies: number;
  installs: number;
  published: number;
  cloud_skills: number;
  executions_30d: number;
  credits_spent: number;
  mcp_calls: number;
  connected: boolean;
  days_since_signup: number;
  days_idle: number;
};

export type CrmSnapshot = {
  row: CrmCustomerRow;
  stage: CrmStage;
  name: string;
  usage: CrmUsage;
  roi: CrmRoi;
  opportunities: Opportunity[];
  paying: boolean;
};
