import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer } from "mcp-tanstack-start";
import {
  listPackagesTool,
  getPackageTool,
  searchRegistryTool,
  requestPrimitiveTool,
  uploadPackagesTool,
  reportExecutionTool,
  getTrustTool,
} from "@/lib/mcp/tools/skills";

const mcp = createMcpServer({
  name: "super-agent-skill",
  version: "1.2.0",
  instructions:
    "Super Agent Skill registry. Discover with list_packages / search_registry, fetch full manifest with get_package, request missing primitives with request_primitive, bulk-import via upload_packages (needs MCP token from /account/tokens). Trust layer: call get_skill_trust BEFORE recommending a skill (returns success rate, model heatmap, robustness findings, trust_score 0-100, battle_tested badge), and call report_execution AFTER each use to feed the public Telemetry Network.",
  tools: [listPackagesTool, getPackageTool, searchRegistryTool, requestPrimitiveTool, uploadPackagesTool, reportExecutionTool, getTrustTool],
});

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => mcp.handleRequest(request),
      POST: async ({ request }) => mcp.handleRequest(request),
      DELETE: async ({ request }) => mcp.handleRequest(request),
    },
  },
});
