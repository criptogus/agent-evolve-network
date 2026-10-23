// Tool catalog for the meta-ads-mcp server (135 tools, Meta Marketing API v25.0)
// Source: https://github.com/mikusnuz/meta-ads-mcp
// Used to ground generated skills/playbooks/guardrails/soul in real tool names.

export type ToolEntry = { name: string; description: string };
export type ToolCategory = { key: string; title: string; tools: ToolEntry[] };

export const META_ADS_MCP = {
  name: "meta-ads-mcp",
  transport: "stdio" as const,
  command: "npx",
  args: ["-y", "meta-ads-mcp"],
  env: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_BUSINESS_ID", "META_PIXEL_ID"],
  scopes: ["ads_management", "ads_read", "business_management", "leads_retrieval", "catalog_management"],
  description: "Meta Marketing API v25.0 — campaigns, audiences, creatives, insights, catalogs.",
  repo: "https://github.com/mikusnuz/meta-ads-mcp",
};

export const META_ADS_CATEGORIES: ToolCategory[] = [
  {
    key: "campaign-management",
    title: "Campaign Management",
    tools: [
      { name: "list_campaigns", description: "List campaigns with filtering and pagination" },
      { name: "get_campaign", description: "Get campaign details by ID" },
      { name: "create_campaign", description: "Create a new campaign" },
      { name: "update_campaign", description: "Update campaign settings" },
      { name: "delete_campaign", description: "Delete a campaign" },
      { name: "copy_campaign", description: "Copy an existing campaign with ad sets and ads" },
      { name: "get_campaign_adsets", description: "List ad sets within a campaign" },
      { name: "get_campaign_ads", description: "List ads within a campaign" },
      { name: "get_campaign_leads", description: "Get leads from a campaign" },
      { name: "list_adsets", description: "List ad sets with filtering" },
      { name: "get_adset", description: "Get ad set details by ID" },
      { name: "create_adset", description: "Create a new ad set" },
      { name: "update_adset", description: "Update ad set settings" },
      { name: "delete_adset", description: "Delete an ad set" },
      { name: "copy_adset", description: "Copy an ad set" },
      { name: "get_adset_targeting_sentence", description: "Human-readable targeting description" },
      { name: "get_adset_ads", description: "List ads within an ad set" },
      { name: "get_adset_leads", description: "Get leads from an ad set" },
      { name: "list_ads", description: "List ads with filtering" },
      { name: "get_ad", description: "Get ad details by ID" },
      { name: "create_ad", description: "Create a new ad" },
      { name: "update_ad", description: "Update ad settings" },
      { name: "delete_ad", description: "Delete an ad" },
      { name: "copy_ad", description: "Copy an ad" },
      { name: "get_ad_preview", description: "Generate ad preview HTML" },
      { name: "get_delivery_estimate", description: "Get delivery estimate for an ad" },
    ],
  },
  {
    key: "creatives",
    title: "Creatives",
    tools: [
      { name: "list_creatives", description: "List ad creatives" },
      { name: "get_creative", description: "Get creative details" },
      { name: "create_creative", description: "Create a new ad creative" },
      { name: "update_creative", description: "Update an ad creative" },
      { name: "create_dynamic_creative", description: "Create a dynamic creative" },
      { name: "generate_preview", description: "Preview from creative spec without an existing ad" },
    ],
  },
  {
    key: "media-assets",
    title: "Media Assets",
    tools: [
      { name: "list_images", description: "List ad images" },
      { name: "upload_image", description: "Upload an image from URL" },
      { name: "get_image", description: "Get image details" },
      { name: "delete_image", description: "Delete an image" },
      { name: "list_videos", description: "List ad videos" },
      { name: "upload_video", description: "Upload a video from URL" },
      { name: "get_video", description: "Get video details" },
      { name: "delete_video", description: "Delete a video" },
      { name: "list_canvases", description: "List Instant Experience canvases" },
      { name: "get_canvas", description: "Get canvas details" },
      { name: "create_canvas", description: "Create a canvas" },
      { name: "delete_canvas", description: "Delete a canvas" },
    ],
  },
  {
    key: "audiences-targeting",
    title: "Audiences & Targeting",
    tools: [
      { name: "list_custom_audiences", description: "List custom audiences" },
      { name: "get_audience", description: "Get audience details" },
      { name: "create_custom_audience", description: "Create a custom audience" },
      { name: "update_audience", description: "Update audience settings" },
      { name: "delete_audience", description: "Delete an audience" },
      { name: "add_users_to_audience", description: "Add users to a custom audience" },
      { name: "remove_users_from_audience", description: "Remove users from a custom audience" },
      { name: "create_lookalike_audience", description: "Create a lookalike audience" },
      { name: "get_audience_health", description: "Audience health, delivery status, match rate" },
      { name: "list_saved_audiences", description: "List saved audiences" },
      { name: "get_saved_audience", description: "Get saved audience details" },
      { name: "search_targeting", description: "Search interests, behaviors, demographics" },
      { name: "search_locations", description: "Search targetable locations" },
      { name: "search_targeting_map", description: "Browse targeting category tree" },
      { name: "get_reach_estimate", description: "Estimate audience reach for targeting spec" },
      { name: "get_targeting_suggestions", description: "Get related targeting suggestions" },
    ],
  },
  {
    key: "insights-reporting",
    title: "Insights & Reporting",
    tools: [
      { name: "get_account_insights", description: "Account-level performance metrics" },
      { name: "get_campaign_insights", description: "Campaign-level performance metrics" },
      { name: "get_adset_insights", description: "Ad set-level performance metrics" },
      { name: "get_ad_insights", description: "Ad-level performance metrics" },
      { name: "create_async_report", description: "Create an async insights report" },
      { name: "get_async_report", description: "Poll async report status and results" },
    ],
  },
  {
    key: "leads",
    title: "Leads",
    tools: [
      { name: "get_form_leads", description: "Get leads from a lead form" },
      { name: "get_lead", description: "Get a single lead by ID" },
      { name: "create_lead_form", description: "Create a new lead generation form on a page" },
      { name: "list_lead_forms", description: "List lead gen forms for a page" },
      { name: "get_lead_form", description: "Get lead form details" },
    ],
  },
  {
    key: "catalog-commerce",
    title: "Catalog & Commerce",
    tools: [
      { name: "list_catalogs", description: "List product catalogs" },
      { name: "get_catalog", description: "Get catalog details" },
      { name: "create_catalog", description: "Create a product catalog" },
      { name: "update_catalog", description: "Update a catalog" },
      { name: "list_product_sets", description: "List product sets in a catalog" },
      { name: "create_product_set", description: "Create a product set" },
      { name: "get_product_set", description: "Get product set details" },
      { name: "update_product_set", description: "Update a product set" },
      { name: "list_products", description: "List products in a catalog" },
      { name: "get_product", description: "Get product details" },
      { name: "update_product", description: "Update a product" },
      { name: "list_feeds", description: "List data feeds for a catalog" },
      { name: "create_feed", description: "Create a data feed" },
      { name: "upload_feed", description: "Upload data to a feed" },
      { name: "get_feed_uploads", description: "Get feed upload history" },
      { name: "batch_products", description: "Batch create/update/delete products (up to 5,000/req)" },
      { name: "get_batch_status", description: "Check status of a catalog batch operation" },
    ],
  },
  {
    key: "automation-rules",
    title: "Automation & Rules",
    tools: [
      { name: "list_rules", description: "List automated rules" },
      { name: "get_rule", description: "Get rule details" },
      { name: "create_rule", description: "Create an automated rule" },
      { name: "update_rule", description: "Update a rule" },
      { name: "delete_rule", description: "Delete a rule" },
    ],
  },
  {
    key: "experiments",
    title: "Experiments",
    tools: [
      { name: "list_experiments", description: "List A/B test experiments" },
      { name: "create_experiment", description: "Create an experiment" },
      { name: "get_experiment", description: "Get experiment details" },
      { name: "update_experiment", description: "Update an experiment" },
      { name: "get_experiment_results", description: "Get experiment results" },
    ],
  },
  {
    key: "conversions",
    title: "Conversions API",
    tools: [
      { name: "send_conversion_event", description: "Send server-side conversion event via CAPI" },
      { name: "send_offline_event", description: "Send an offline conversion event" },
      { name: "list_offline_event_sets", description: "List offline event sets" },
      { name: "create_offline_event_set", description: "Create an offline event set" },
    ],
  },
  {
    key: "budget-planning",
    title: "Budget & Planning",
    tools: [
      { name: "list_budget_schedules", description: "List budget schedules" },
      { name: "create_budget_schedule", description: "Create a budget schedule" },
      { name: "update_budget_schedule", description: "Update a budget schedule" },
      { name: "delete_budget_schedule", description: "Delete a budget schedule" },
      { name: "list_rf_predictions", description: "List Reach & Frequency predictions" },
      { name: "create_rf_prediction", description: "Create a Reach & Frequency prediction" },
      { name: "get_rf_prediction", description: "Get prediction details" },
      { name: "delete_rf_prediction", description: "Delete a prediction" },
    ],
  },
  {
    key: "brand-safety",
    title: "Brand Safety",
    tools: [
      { name: "list_block_lists", description: "List publisher block lists" },
      { name: "create_block_list", description: "Create a block list" },
      { name: "add_to_block_list", description: "Add URLs/domains to a block list" },
      { name: "remove_from_block_list", description: "Remove entries from a block list" },
      { name: "delete_block_list", description: "Delete a block list" },
    ],
  },
  {
    key: "account-business",
    title: "Account & Business",
    tools: [
      { name: "get_ad_account", description: "Get ad account details" },
      { name: "list_ad_accounts", description: "List ad accounts for a business" },
      { name: "update_ad_account", description: "Update ad account settings" },
      { name: "get_account_activities", description: "Get account activity log" },
      { name: "list_account_users", description: "List users with access to the account" },
      { name: "list_businesses", description: "List businesses you have access to" },
      { name: "get_business", description: "Get business details" },
      { name: "list_business_ad_accounts", description: "List ad accounts in a business" },
      { name: "list_business_users", description: "List users in a business" },
      { name: "add_business_user", description: "Add a user to a business" },
      { name: "remove_business_user", description: "Remove a user from a business" },
      { name: "list_business_pages", description: "List Facebook Pages owned by a business" },
      { name: "list_business_instagram_accounts", description: "List Instagram accounts in a business" },
      { name: "list_system_users", description: "List system users for a business" },
      { name: "create_system_user", description: "Create a system user" },
    ],
  },
  {
    key: "auth-token",
    title: "Auth & Token",
    tools: [
      { name: "exchange_token", description: "Exchange short-lived for long-lived token" },
      { name: "refresh_token", description: "Refresh a long-lived token" },
      { name: "debug_token", description: "Debug/inspect token metadata" },
    ],
  },
  {
    key: "ad-library",
    title: "Ad Library",
    tools: [{ name: "search_ad_library", description: "Search Meta Ad Library for public ad data" }],
  },
];

export type Blueprint = {
  id: string;
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  brief: string;
  category_keys: string[]; // tool categories to ground with
  resources?: string[];
};

// 15 skills (one per category) + 4 playbooks + 1 soul + 2 guardrails = 22 packages
export const BLUEPRINTS: Blueprint[] = [
  // SKILLS — one per Meta category
  ...META_ADS_CATEGORIES.map<Blueprint>((c) => ({
    id: `skill-${c.key}`,
    slug: `meta-ads-${c.key}`,
    name: `Meta Ads — ${c.title}`,
    type: "skill",
    brief: `A tool-grounded skill for ${c.title} on Meta Ads. The agent must call the listed meta-ads-mcp tools with correct arguments, validate IDs, paginate results, and return structured outcomes referencing the exact tool calls performed. Surface errors from the API verbatim and propose remediation.`,
    category_keys: [c.key],
    resources: [`meta-ads://${c.key}`],
  })),

  // PLAYBOOKS — multi-step decision flows
  {
    id: "playbook-launch",
    slug: "meta-ads-launch-playbook",
    name: "Meta Ads — New Campaign Launch Playbook",
    type: "playbook",
    brief:
      "End-to-end launch flow: brief → audience definition → creative spec → adset configuration → preview & delivery estimate → human approval → activation. Must use audience, creative, campaign and insights tools. Always run get_delivery_estimate and get_reach_estimate before activation; never skip approval gate for spend > €100/day.",
    category_keys: ["audiences-targeting", "creatives", "campaign-management", "insights-reporting", "budget-planning"],
  },
  {
    id: "playbook-optimize",
    slug: "meta-ads-performance-optimization",
    name: "Meta Ads — Performance Optimization Playbook",
    type: "playbook",
    brief:
      "Daily/weekly optimization loop: pull insights → diagnose underperformers (CPA, CTR, frequency, audience saturation) → decide pause/scale/iterate → apply update_adset / update_ad / create_rule → log decisions with metrics. Always cite the tool call IDs that backed each decision.",
    category_keys: ["insights-reporting", "automation-rules", "campaign-management", "audiences-targeting"],
  },
  {
    id: "playbook-creative-iteration",
    slug: "meta-ads-creative-iteration",
    name: "Meta Ads — Creative Iteration Playbook",
    type: "playbook",
    brief:
      "Creative refresh cycle to fight ad fatigue: detect frequency > 3 or CTR drop > 25% → generate variant briefs → upload media → create_creative + create_ad → set up create_experiment for fair A/B → measure with get_experiment_results.",
    category_keys: ["creatives", "media-assets", "experiments", "insights-reporting"],
  },
  {
    id: "playbook-capi",
    slug: "meta-ads-capi-deployment",
    name: "Meta Ads — Conversions API Deployment Playbook",
    type: "playbook",
    brief:
      "Deploy and validate CAPI: design event taxonomy → deduplicate with browser pixel via event_id → send_conversion_event with hashed PII (email/phone SHA-256) → verify match quality → set up offline event sets for in-store conversions.",
    category_keys: ["conversions", "account-business"],
  },

  // SOUL
  {
    id: "soul-perf-marketer",
    slug: "meta-ads-performance-marketer-soul",
    name: "Meta Ads — Senior Performance Marketer Soul",
    type: "soul",
    brief:
      "Persona/values layer of a senior paid social strategist: data-driven, transparent about tradeoffs, conservative with spend until evidence justifies scale. Communicates in plain business language (CPA, ROAS, MER), always references the underlying tool call/metric, and refuses vanity-metric reasoning.",
    category_keys: ["insights-reporting"],
  },

  // GUARDRAILS
  {
    id: "guardrail-budget",
    slug: "meta-ads-budget-safety-guardrail",
    name: "Meta Ads — Budget Safety Guardrail",
    type: "guardrail",
    brief:
      "Prevents runaway spend: blocks update_campaign / update_adset that increase daily budget by >50% in one step, blocks delete_* without explicit human confirmation, requires get_delivery_estimate before any activation. Logs the proposed change and the override token if a human bypasses.",
    category_keys: ["campaign-management", "budget-planning"],
  },
  {
    id: "guardrail-policy",
    slug: "meta-ads-policy-compliance-guardrail",
    name: "Meta Ads — Policy & Privacy Compliance Guardrail",
    type: "guardrail",
    brief:
      "Enforces Meta ad policies and privacy: rejects creatives implying personal attributes (health, sexual orientation, etc.), forbids non-hashed PII in audience uploads (add_users_to_audience must use SHA-256), forbids targeting under 18 for restricted verticals, requires brand-safety block lists for in-stream placements.",
    category_keys: ["creatives", "audiences-targeting", "brand-safety", "conversions"],
  },
];

export function categoryByKey(key: string) {
  return META_ADS_CATEGORIES.find((c) => c.key === key);
}

export function buildGroundingForBlueprint(bp: Blueprint): string {
  const cats = bp.category_keys.map(categoryByKey).filter(Boolean) as ToolCategory[];
  const lines: string[] = [];
  lines.push(`MCP server: ${META_ADS_MCP.name} (${META_ADS_MCP.repo})`);
  lines.push(`Transport: ${META_ADS_MCP.transport}, command: ${META_ADS_MCP.command} ${META_ADS_MCP.args.join(" ")}`);
  lines.push(`Required env: ${META_ADS_MCP.env.join(", ")}`);
  lines.push(`Required scopes: ${META_ADS_MCP.scopes.join(", ")}`);
  lines.push("");
  lines.push("Available tool categories (call these BY NAME — do not invent tools):");
  for (const c of cats) {
    lines.push(`\n## ${c.title}`);
    for (const t of c.tools) lines.push(`- ${t.name}: ${t.description}`);
  }
  lines.push(
    "\nGrounding rules:\n- Only call tools listed above.\n- Always include the ad_account_id (META_AD_ACCOUNT_ID) where applicable.\n- Validate IDs returned by list_* before using them in update_*/delete_*.\n- Paginate when list_* returns a cursor.\n- Surface API errors verbatim and propose a remediation step.",
  );
  return lines.join("\n");
}
