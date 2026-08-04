import { createFileRoute } from "@tanstack/react-router";
import { startExam } from "@/lib/university/university.server";
import { DOMAINS, type DomainId } from "@/lib/university/types";

/**
 * Plain-JSON door into the admission exam (step 1). Same engine the
 * `diagnose_start` MCP tool uses — no JSON-RPC, no SSE, no auth.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

const VALID = new Set(DOMAINS.map((d) => d.id));

export const Route = createFileRoute("/api/public/diagnose/start")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/diagnose/start",
          method: "POST",
          domains: DOMAINS,
          body_schema: {
            domain: "gtm | engineering | support | finance | data | marketing | b2b_sales | customer_success | pricing | strategy | project_management | people_ops | legal_compliance | corporate_finance | agentic_crm | supply_chain | data_engineering | social_media | google_ads | meta_ads | linkedin_ads | digital_product | complex_software | tools_mcp | cybersecurity",
            installed_skills: "string[] (optional) — slugs the agent already carries",
            agent_fp: "string (optional) — stable agent fingerprint for delta tracking",
            limit: "number (optional, max 40)",
          },
          next: "POST /api/public/diagnose/submit with { diagnosis_id, answers }",
          example: {
            curl: `curl -sS https://superagentskill.com/api/public/diagnose/start -H 'Content-Type: application/json' -d '{"domain":"gtm"}'`,
          },
        }),

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const domain = String(body.domain ?? "");
        if (!VALID.has(domain as DomainId)) {
          return json({ ok: false, error: "invalid_domain", domains: DOMAINS.map((d) => d.id) }, 400);
        }
        const installed = Array.isArray(body.installed_skills)
          ? (body.installed_skills as unknown[]).slice(0, 64).map(String)
          : [];
        const limit = Number.isFinite(body.limit as number)
          ? Math.max(1, Math.min(40, Number(body.limit)))
          : 40;

        const exam = await startExam({
          domain: domain as DomainId,
          installedSkills: installed,
          agentFp: typeof body.agent_fp === "string" ? body.agent_fp.slice(0, 120) : null,
          limit,
        });
        return json({ ok: true, ...exam });
      },
    },
  },
});
