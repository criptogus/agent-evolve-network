import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { CORS_HEADERS } from "@/lib/oauth/mcp-oauth.server";
const supabaseAdmin = _supabaseAdmin as any;

// Public health endpoint for the MCP service. Returns 200 with a JSON
// payload describing service status (db reachable + reported latency)
// and a build version, plus CORS so dashboards / clients can hit it
// from anywhere. We do not gate this behind auth — knowing whether the
// service is up is not sensitive, and 401/403 on a health check is
// exactly the wrong UX for status pages.
const VERSION = "1.5.0";
const STARTED_AT = Date.now();

async function probe(): Promise<{ ok: boolean; ping_ms: number | null }> {
  const t0 = Date.now();
  try {
    // Lightest possible read — count(*) HEAD against a small table.
    const { error } = await supabaseAdmin
      .from("mcp_oauth_clients")
      .select("client_id", { count: "exact", head: true })
      .limit(1);
    if (error) return { ok: false, ping_ms: null };
    return { ok: true, ping_ms: Date.now() - t0 };
  } catch {
    return { ok: false, ping_ms: null };
  }
}

async function handle(): Promise<Response> {
  const db = await probe();
  const body = {
    ok: db.ok,
    version: VERSION,
    uptime_seconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    db: { ok: db.ok, ping_ms: db.ping_ms },
    endpoint: "https://superagentskill.com/api/public/mcp",
    docs: "https://superagentskill.com/docs/mcp",
    status_page: "https://superagentskill.com/status",
    checked_at: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status: db.ok ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/mcp/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => handle(),
      HEAD: async () => handle(),
    },
  },
});
