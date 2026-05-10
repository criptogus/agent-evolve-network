import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer } from "mcp-tanstack-start";
import {
  listPackagesTool,
  getPackageTool,
  searchRegistryTool,
  requestPrimitiveTool,
} from "@/lib/mcp/tools/skills";

const mcp = createMcpServer({
  name: "super-agent-skill",
  version: "1.0.0",
  instructions:
    "Super Agent Skill registry. Use list_packages or search_registry to discover skills, playbooks, souls, and guardrails. Use get_package to retrieve the full manifest (system prompt, rules, examples). Use request_primitive when a needed primitive is missing — the platform will research and create it.",
  tools: [listPackagesTool, getPackageTool, searchRegistryTool, requestPrimitiveTool],
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
