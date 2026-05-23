// Closed type catalog for every Super Agent Skill MCP tool. Generated
// once, by hand, from src/lib/mcp/tools/skills.ts. When the server
// adds a tool we update this file in the same PR so the SDK never
// drifts from the wire format.

export type PrimitiveType = "skill" | "playbook" | "soul" | "guardrail";

export type Package = {
  slug: string;
  name: string;
  type: PrimitiveType;
  description: string;
  latest_version: string;
  author_handle?: string;
  install_count?: number;
};

export type PackageVersion = {
  version: string;
  status: "stable" | "beta";
  system_prompt: string;
  rules: Record<string, unknown>;
  examples: Array<{ title: string; input: string; expected_output: string }>;
  compatibility: unknown[];
  notes: string;
};

export type ListPackagesInput = {
  type?: PrimitiveType;
  query?: string;
  limit?: number;
};
export type ListPackagesOutput = { count: number; items: Package[] };

export type SearchRegistryInput = { query: string; limit?: number };
export type SearchRegistryOutput = { query: string; count: number; items: Package[] };

export type GetPackageInput = { slug: string };
export type GetPackageOutput = { package: Package; version: PackageVersion };

export type RequestPrimitiveInput = {
  type: PrimitiveType;
  brief: string;
  industry?: string;
  /** Opaque string generated once per logical request. Retries within 24h replay the original response. */
  idempotency_key?: string;
};
export type RequestPrimitiveOutput = {
  request_id: string;
  status: "queued" | "running" | "done" | "failed";
  note: string;
  replayed?: true;
};

export type UploadFile = { name: string; content: string; type?: PrimitiveType };
export type UploadPackagesInput = {
  files: UploadFile[];
  /** Repeats within 24h replay the original response and DO NOT re-process the files. */
  idempotency_key?: string;
};
export type UploadResultItem = {
  ok: boolean;
  slug?: string;
  name?: string;
  type?: PrimitiveType;
  error?: string;
};
export type UploadPackagesOutput = {
  uploaded: number;
  failed: number;
  visibility: "private_draft";
  next_step: string;
  results: UploadResultItem[];
  replayed?: true;
};

export type ReportExecutionInput = {
  slug: string;
  success: boolean;
  model?: string;
  version?: string;
  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  agent_fp?: string;
  notes?: string;
};
export type ReportExecutionOutput = { recorded: boolean };

export type GetMethodologyOutput = { engine: string; methodology: unknown };
export type ReviewSkillInput = { content: string; type?: PrimitiveType };
export type ReviewSkillOutput = {
  overall_score: number;
  band: string;
  top_actions: string[];
  per_pillar: Record<string, { score: number }>;
};

export type ToolMap = {
  list_packages: { input: ListPackagesInput; output: ListPackagesOutput };
  search_registry: { input: SearchRegistryInput; output: SearchRegistryOutput };
  get_package: { input: GetPackageInput; output: GetPackageOutput };
  request_primitive: { input: RequestPrimitiveInput; output: RequestPrimitiveOutput };
  upload_packages: { input: UploadPackagesInput; output: UploadPackagesOutput };
  report_execution: { input: ReportExecutionInput; output: ReportExecutionOutput };
  get_methodology: { input: Record<string, never>; output: GetMethodologyOutput };
  review_skill: { input: ReviewSkillInput; output: ReviewSkillOutput };
};

export type ToolName = keyof ToolMap;
export type ToolInput<T extends ToolName> = ToolMap[T]["input"];
export type ToolOutput<T extends ToolName> = ToolMap[T]["output"];

// ----- Errors --------------------------------------------------------

export class MCPError extends Error {
  public readonly code: number;
  public readonly status: number;
  public readonly data: unknown;
  constructor(message: string, opts: { code: number; status: number; data?: unknown }) {
    super(message);
    this.name = "MCPError";
    this.code = opts.code;
    this.status = opts.status;
    this.data = opts.data;
  }
}

export class MCPUnauthorizedError extends MCPError {
  public readonly authorizationUrl?: string;
  public readonly tokensUrl?: string;
  constructor(message: string, data?: any) {
    super(message, { code: -32001, status: 401, data });
    this.name = "MCPUnauthorizedError";
    this.authorizationUrl = data?.authorization_url;
    this.tokensUrl = data?.tokens_url;
  }
}

export class MCPRateLimitedError extends MCPError {
  public readonly retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number, data?: unknown) {
    super(message, { code: -32029, status: 429, data });
    this.name = "MCPRateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type RateLimitInfo = {
  limit?: number;
  remaining?: number;
  resetAtUnix?: number;
  window?: string;
};
