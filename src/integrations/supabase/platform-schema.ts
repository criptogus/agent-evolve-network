import type { Json } from "./types";
type Table<R, I = Partial<R>> = { Row: R; Insert: I; Update: Partial<R>; Relationships: [] };
export type TeamRole = "viewer" | "editor" | "admin";
export type Workspace = { id: string; name: string; owner_id: string; created_at: string };
export type TeamMember = {
  workspace_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
};
export type TeamSkill = {
  id: string;
  workspace_id: string;
  slug: string;
  version: string;
  name: string;
  description: string;
  files: Json;
  status: "pending" | "approved" | "rejected";
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
};
export type TeamPin = {
  workspace_id: string;
  package_id: string;
  version_id: string;
  pinned_by: string;
  pinned_at: string;
};
export type EvidenceRow = {
  arm: string;
  version: string | null;
  model: string | null;
  experiment_key: string | null;
  executions: number;
  measured: number;
  completed: number;
  avg_latency_ms: number | null;
  total_tokens: number | null;
};
export type PlatformTables = {
  package_artifacts: Table<
    {
      version_id: string;
      package_id: string;
      files: Json;
      sha256: string;
      created_by: string | null;
      created_at: string;
    },
    {
      version_id: string;
      package_id: string;
      files: Json;
      sha256: string;
      created_by: string | null;
      created_at?: string;
    }
  >;
  team_workspaces: Table<Workspace>;
  team_members: Table<TeamMember>;
  team_invites: Table<{
    id: string;
    workspace_id: string;
    email: string;
    role: TeamRole;
    token_hash: string;
    created_by: string;
    expires_at: string;
    accepted_at: string | null;
  }>;
  team_skill_versions: Table<TeamSkill>;
  team_library: Table<TeamPin>;
  team_audit_events: Table<{
    id: string;
    workspace_id: string;
    actor_id: string;
    action: string;
    detail: Json;
    created_at: string;
  }>;
};
export type PlatformFunctions = {
  team_role: { Args: { _workspace: string }; Returns: TeamRole | null };
  team_action: { Args: { _action: string; _workspace?: string; _payload?: Json }; Returns: Json };
  skill_evidence: {
    Args: {
      _slug: string;
      _version?: string;
      _model?: string;
      _experiment?: string;
      _days?: number;
    };
    Returns: EvidenceRow[];
  };
};
