// Curated registry of well-known external MCP servers we can recommend
// alongside Super Agent Skill packages. The Match evaluator picks from this
// list; users connect with the env vars/scopes the server needs.

export type McpEnvField = {
  key: string;
  label: string;
  required: boolean;
  helper?: string;
  secret?: boolean;
};

export type McpRegistryEntry = {
  id: string;
  name: string;
  vendor: string;
  category:
    | "ads"
    | "crm"
    | "growth"
    | "dev"
    | "data"
    | "comms"
    | "docs"
    | "support"
    | "search"
    | "analytics";
  description: string;
  // tags help LLM matching against agent briefs
  tags: string[];
  transport: "http" | "stdio" | "sse";
  url?: string;
  command?: string;
  args?: string[];
  scopes: string[];
  env: McpEnvField[];
  homepage: string;
  // hint to LLM: which package types this MCP pairs well with
  pairs_well_with: Array<"skill" | "playbook" | "soul" | "guardrail">;
};

export const MCP_REGISTRY: McpRegistryEntry[] = [
  {
    id: "meta-ads-mcp",
    name: "Meta Ads MCP",
    vendor: "mikusnuz/community",
    category: "ads",
    description:
      "Manage Facebook & Instagram ad accounts: campaigns, ad sets, creatives, insights and budget pacing — all from your agent.",
    tags: ["meta", "facebook", "instagram", "paid social", "performance marketing", "campaign optimization"],
    transport: "stdio",
    command: "uvx",
    args: ["meta-ads-mcp"],
    scopes: ["ads_read", "ads_management", "business_management"],
    env: [
      { key: "META_APP_ID", label: "Meta App ID", required: true },
      { key: "META_APP_SECRET", label: "Meta App Secret", required: true, secret: true },
      { key: "META_ACCESS_TOKEN", label: "Long-lived Access Token", required: true, secret: true, helper: "Generate at developers.facebook.com → Tools → Access Token Tool" },
    ],
    homepage: "https://github.com/mikusnuz/meta-ads-mcp",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "google-ads-mcp",
    name: "Google Ads MCP",
    vendor: "community",
    category: "ads",
    description:
      "Search, edit and report on Google Ads campaigns, keywords, negative lists and Performance Max assets.",
    tags: ["google ads", "sem", "search ads", "ppc", "performance marketing"],
    transport: "stdio",
    command: "uvx",
    args: ["google-ads-mcp"],
    scopes: ["adwords"],
    env: [
      { key: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer Token", required: true, secret: true },
      { key: "GOOGLE_ADS_CLIENT_ID", label: "OAuth Client ID", required: true },
      { key: "GOOGLE_ADS_CLIENT_SECRET", label: "OAuth Client Secret", required: true, secret: true },
      { key: "GOOGLE_ADS_REFRESH_TOKEN", label: "Refresh Token", required: true, secret: true },
      { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", label: "MCC Customer ID", required: false },
    ],
    homepage: "https://github.com/cohnen/mcp-google-ads",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "hubspot-mcp",
    name: "HubSpot MCP",
    vendor: "hubspot",
    category: "crm",
    description:
      "Read & write HubSpot contacts, companies, deals and engagements. Ideal for SDR / lifecycle agents.",
    tags: ["crm", "hubspot", "sdr", "sales", "pipeline", "contacts", "deals"],
    transport: "http",
    url: "https://mcp.hubspot.com/v1/sse",
    scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read", "crm.objects.deals.write"],
    env: [
      { key: "HUBSPOT_PRIVATE_APP_TOKEN", label: "Private App Access Token", required: true, secret: true, helper: "HubSpot → Settings → Integrations → Private Apps" },
    ],
    homepage: "https://developers.hubspot.com/mcp",
    pairs_well_with: ["skill", "playbook", "guardrail"],
  },
  {
    id: "linear-mcp",
    name: "Linear MCP",
    vendor: "linear",
    category: "dev",
    description: "Create, update and triage Linear issues, projects and cycles.",
    tags: ["issues", "engineering", "tickets", "project management", "triage", "roadmap"],
    transport: "http",
    url: "https://mcp.linear.app/sse",
    scopes: ["read", "write", "issues:create"],
    env: [{ key: "LINEAR_API_KEY", label: "Linear API Key", required: true, secret: true }],
    homepage: "https://linear.app/developers/mcp",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "github-mcp",
    name: "GitHub MCP",
    vendor: "github",
    category: "dev",
    description: "Read repos, open PRs, file issues, run code search, list checks.",
    tags: ["repo", "code review", "pr", "issues", "ci", "engineering"],
    transport: "http",
    url: "https://api.githubcopilot.com/mcp/",
    scopes: ["repo", "read:user", "workflow"],
    env: [{ key: "GITHUB_PERSONAL_ACCESS_TOKEN", label: "GitHub PAT (fine-grained)", required: true, secret: true }],
    homepage: "https://github.com/github/github-mcp-server",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "notion-mcp",
    name: "Notion MCP",
    vendor: "notion",
    category: "docs",
    description: "Search, create and update Notion pages and databases.",
    tags: ["docs", "wiki", "knowledge base", "specs", "notion"],
    transport: "http",
    url: "https://mcp.notion.com/sse",
    scopes: ["read_content", "update_content", "insert_content"],
    env: [{ key: "NOTION_TOKEN", label: "Internal Integration Token", required: true, secret: true }],
    homepage: "https://developers.notion.com/docs/mcp",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "slack-mcp",
    name: "Slack MCP",
    vendor: "slack",
    category: "comms",
    description: "Post messages, read channels, react and thread — useful for handoffs and human-in-the-loop.",
    tags: ["chat", "notifications", "handoff", "slack", "ops"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    scopes: ["chat:write", "channels:read", "channels:history"],
    env: [
      { key: "SLACK_BOT_TOKEN", label: "Bot Token (xoxb-…)", required: true, secret: true },
      { key: "SLACK_TEAM_ID", label: "Team ID", required: true },
    ],
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    pairs_well_with: ["skill", "playbook", "guardrail"],
  },
  {
    id: "posthog-mcp",
    name: "PostHog MCP",
    vendor: "posthog",
    category: "analytics",
    description: "Query product analytics, run insights, manage feature flags and experiments.",
    tags: ["analytics", "events", "feature flags", "experiments", "growth"],
    transport: "http",
    url: "https://mcp.posthog.com/sse",
    scopes: ["read:insight", "read:event", "write:feature_flag"],
    env: [{ key: "POSTHOG_PERSONAL_API_KEY", label: "Personal API Key", required: true, secret: true }],
    homepage: "https://posthog.com/docs/ai/mcp",
    pairs_well_with: ["skill", "playbook"],
  },
  {
    id: "stripe-mcp",
    name: "Stripe MCP",
    vendor: "stripe",
    category: "data",
    description: "Look up customers, subscriptions, invoices and revenue. Refunds gated by guardrails.",
    tags: ["billing", "payments", "revenue", "subscriptions", "stripe"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@stripe/mcp", "--tools=all"],
    scopes: ["read_only", "write"],
    env: [{ key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", required: true, secret: true }],
    homepage: "https://github.com/stripe/agent-toolkit",
    pairs_well_with: ["skill", "guardrail"],
  },
  {
    id: "tavily-mcp",
    name: "Tavily Search MCP",
    vendor: "tavily",
    category: "search",
    description: "Real-time web search and extract for grounding agent answers.",
    tags: ["web search", "research", "grounding", "rag", "browse"],
    transport: "http",
    url: "https://mcp.tavily.com/sse",
    scopes: ["search"],
    env: [{ key: "TAVILY_API_KEY", label: "Tavily API Key", required: true, secret: true }],
    homepage: "https://docs.tavily.com/docs/mcp",
    pairs_well_with: ["skill"],
  },
  {
    id: "sentry-mcp",
    name: "Sentry MCP",
    vendor: "sentry",
    category: "dev",
    description: "List issues, fetch stack traces and link errors back to commits.",
    tags: ["errors", "observability", "debugging", "sentry"],
    transport: "http",
    url: "https://mcp.sentry.dev/sse",
    scopes: ["org:read", "project:read", "event:read"],
    env: [
      { key: "SENTRY_AUTH_TOKEN", label: "Auth Token", required: true, secret: true },
      { key: "SENTRY_ORG", label: "Organization Slug", required: true },
    ],
    homepage: "https://docs.sentry.io/product/sentry-mcp/",
    pairs_well_with: ["skill", "playbook"],
  },
];

export function getMcpById(id: string) {
  return MCP_REGISTRY.find((m) => m.id === id);
}

export function compactMcpCatalogForLLM() {
  return MCP_REGISTRY.map(
    (m) =>
      `- [${m.category}] ${m.id} :: ${m.name} (${m.vendor}) — ${m.description} | tags: ${m.tags.join(", ")}`
  ).join("\n");
}
