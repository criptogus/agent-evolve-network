import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  AGENT_PLUGINS_VERSION,
  PLUGIN_SCHEMA_URL,
  MCP_SCHEMA_URL,
  SAK_SITE,
} from "@/lib/plugins/agent-plugins";

const supabaseAdmin = _supabaseAdmin as any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/plugins.json
// Discovery index of every published package available as an Agent Plugins v1
// portable package (https://agent-plugins.org).
export const Route = createFileRoute("/api/public/plugins.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("packages")
          .select("id,slug,name,type,description,latest_version,install_count")
          .eq("is_published", true)
          .eq("review_status", "approved")
          .order("install_count", { ascending: false })
          .limit(500);

        if (error) {
          console.error("[api/public/plugins.json] db error:", error);
          return new Response(JSON.stringify({ error: "internal_server_error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        const { data: scores } = await supabaseAdmin
          .from("package_trust_scores")
          .select("package_id,score");
        const scoreByPackage = new Map<string, number>(
          (scores ?? []).map((s: any) => [s.package_id as string, s.score as number]),
        );

        const plugins = (data ?? []).map((p: any) => ({
          name: p.slug,
          title: p.name,
          type: p.type,
          description: p.description,
          version: p.latest_version,
          trust_score: scoreByPackage.get(p.id) ?? null,
          installs: p.install_count ?? 0,
          plugin_manifest: `${SAK_SITE}/api/public/plugins/${p.slug}/plugin.json`,
          mcp_config: `${SAK_SITE}/api/public/plugins/${p.slug}/mcp.json`,
          package_zip: `${SAK_SITE}/api/public/plugins/${p.slug}.zip`,
          homepage: `${SAK_SITE}/marketplace/${p.slug}`,
        }));

        return new Response(
          JSON.stringify({
            agent_plugins_version: AGENT_PLUGINS_VERSION,
            plugin_schema: PLUGIN_SCHEMA_URL,
            mcp_schema: MCP_SCHEMA_URL,
            count: plugins.length,
            plugins,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
              ...CORS,
            },
          },
        );
      },
    },
  },
});
