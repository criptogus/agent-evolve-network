import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer } from "mcp-tanstack-start";
import {
  listPackagesTool,
  getPackageTool,
  searchRegistryTool,
  requestPrimitiveTool,
  uploadPackagesTool,
} from "@/lib/mcp/tools/skills";

const mcp = createMcpServer({
  name: "super-agent-skill",
  version: "1.1.0",
  instructions:
    "Super Agent Skill registry. Use list_packages or search_registry to discover skills, playbooks, souls, and guardrails. Use get_package to retrieve the full manifest. Use request_primitive when a needed primitive is missing. Use upload_packages (requires a personal MCP token from /account/tokens) to bulk-import skills, playbooks, souls, or guardrails — mirrors the /upload UI exactly.",
  tools: [listPackagesTool, getPackageTool, searchRegistryTool, requestPrimitiveTool, uploadPackagesTool],
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
