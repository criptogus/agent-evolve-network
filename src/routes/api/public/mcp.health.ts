import { createFileRoute } from "@tanstack/react-router";

const TOOLS = [
  { name: "list_packages", auth: false },
  { name: "search_registry", auth: false },
  { name: "get_package", auth: false },
  { name: "request_primitive", auth: false },
  { name: "upload_packages", auth: true },
];

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

export const Route = createFileRoute("/api/public/mcp/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            name: "super-agent-skill",
            version: "1.1.0",
            transport: "streamable-http",
            endpoint: "/api/public/mcp",
            tools: TOOLS,
            ts: new Date().toISOString(),
          }),
          { headers }
        ),
    },
  },
});
