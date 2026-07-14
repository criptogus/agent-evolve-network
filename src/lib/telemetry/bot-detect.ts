/**
 * Lightweight User-Agent classifier used by funnel telemetry.
 *
 * We intentionally err on the side of tagging things as bots:
 * anything we can't confidently pin to a real browser or a known
 * agent client (MCP, Claude Desktop, Cursor, etc.) is treated as
 * a bot for reporting purposes. Human-traffic reports subtract
 * these; nothing is dropped from the raw event stream.
 */

export type UaClass = {
  isBot: boolean;
  /** Short lowercase identifier used for grouping ("chrome", "safari", "googlebot", "curl", "mcp", ...). */
  family: string;
};

// Explicit deny-list of bot / crawler / probe signatures. Case-insensitive.
const BOT_PATTERNS: Array<[RegExp, string]> = [
  [/googlebot/i, "googlebot"],
  [/bingbot/i, "bingbot"],
  [/duckduckbot/i, "duckduckbot"],
  [/yandex(bot|images)/i, "yandexbot"],
  [/baiduspider/i, "baiduspider"],
  [/applebot/i, "applebot"],
  [/facebookexternalhit|facebot|meta-externalagent/i, "facebook"],
  [/twitterbot/i, "twitterbot"],
  [/linkedinbot/i, "linkedinbot"],
  [/slackbot/i, "slackbot"],
  [/discordbot/i, "discordbot"],
  [/telegrambot/i, "telegrambot"],
  [/whatsapp/i, "whatsapp"],
  [/gptbot|oai-searchbot|chatgpt-user/i, "gptbot"],
  [/claude-web|claudebot|anthropic-ai/i, "claudebot"],
  [/perplexitybot/i, "perplexitybot"],
  [/ccbot/i, "ccbot"],
  [/ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|seznambot/i, "seo-crawler"],
  [/uptimerobot|pingdom|statuscake|newrelicpinger|datadogsynth/i, "uptime-probe"],
  [/censys|shodan|masscan|zgrab|nmap|nuclei/i, "security-scanner"],
  [/headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver/i, "headless"],
  [/python-requests|aiohttp|httpx|okhttp|go-http-client|libwww-perl|java\//i, "http-lib"],
  [/curl\//i, "curl"],
  [/wget\//i, "wget"],
  [/postmanruntime|insomnia/i, "api-client"],
  [/\bbot\b|crawler|spider|scraper|fetch|monitor/i, "generic-bot"],
];

// Known real agent clients — not browsers, but not "bots" either.
const AGENT_PATTERNS: Array<[RegExp, string]> = [
  [/claude-?desktop|claude\/[\d.]+/i, "claude-desktop"],
  [/cursor\//i, "cursor"],
  [/windsurf/i, "windsurf"],
  [/cline\b/i, "cline"],
  [/lovable\b/i, "lovable"],
  [/openai|codex-?cli/i, "openai"],
  [/mcp[-_ ]?(client|host)|modelcontextprotocol/i, "mcp-client"],
];

// Real browsers.
const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/edg\//i, "edge"],
  [/opr\/|opera/i, "opera"],
  [/firefox\//i, "firefox"],
  [/chrome\//i, "chrome"],
  [/safari\//i, "safari"],
];

export function classifyUserAgent(ua: string | null | undefined): UaClass {
  const s = (ua ?? "").trim();
  if (!s) return { isBot: true, family: "empty-ua" };

  for (const [re, name] of BOT_PATTERNS) if (re.test(s)) return { isBot: true, family: name };
  for (const [re, name] of AGENT_PATTERNS) if (re.test(s)) return { isBot: false, family: name };
  for (const [re, name] of BROWSER_PATTERNS) if (re.test(s)) return { isBot: false, family: name };

  // Unrecognized UA — treat as bot for reporting; still stored in raw events.
  return { isBot: true, family: "unknown" };
}
