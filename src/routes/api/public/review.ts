import { createFileRoute } from "@tanstack/react-router";
import { computeReview } from "@/lib/mcp/tools/skills";
import { projectImpact, projectionToText } from "@/lib/skills/impact-projection";

/**
 * Plain-JSON review endpoint — the no-MCP, no-SSE door into the same engine
 * `review_skill` uses.
 *
 * Customer feedback: JSON-RPC over Server-Sent Events means any non-MCP client
 * has to parse multi-line `event:` / `data:` frames just to read one score.
 * This route takes a normal JSON body and returns a normal JSON body, so a
 * single `curl` / `fetch` is enough. It lives under `/api/public/*` so edge
 * firewalls that block datacenter/foreign IPs on `/api/mcp` don't reach it.
 *
 * Read-only, anonymous, no persistence.
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

const TYPES = new Set(["skill", "playbook", "soul", "guardrail"]);
const DOC_CLASSES = new Set(["skill", "governance", "playbook-ops", "guardrail-ops", "auto"]);
const LANGS = new Set(["en", "pt", "es", "fr", "de", "it"]);

export const Route = createFileRoute("/api/public/review")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // Self-documenting GET so a developer poking the URL in a browser gets
      // the contract instead of a 404 or a cryptic RPC error.
      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/review",
          method: "POST",
          content_type: "application/json",
          note: "Same scoring engine as the `review_skill` MCP tool, but plain JSON in / plain JSON out — no JSON-RPC, no SSE, no auth.",
          body_schema: {
            name: "string (1-200) — file or skill name, report header only",
            type: "skill | playbook | soul | guardrail (default: skill)",
            content: "string (20-120000) — raw markdown/prompt text, verbatim",
            doc_class: "skill | governance | playbook-ops | guardrail-ops | auto (default: auto)",
            semantic_check: "boolean (default: true) — LLM semantic pass",
            language: "en | pt | es | fr | de | it (optional override)",
          },
          example: {
            curl: `curl -sS https://superagentskill.com/api/public/review -H 'Content-Type: application/json' -d '{"name":"my-skill","content":"...raw SKILL.md..."}'`,
          },
        }),

      POST: async ({ request }) => {
        let body: Record<string, unknown> | null = null;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json", message: "Body must be valid JSON." }, 400);
        }
        if (!body || typeof body !== "object") {
          return json({ ok: false, error: "invalid_body", message: "Body must be a JSON object." }, 400);
        }

        const content = typeof body.content === "string" ? body.content : "";
        if (content.trim().length < 20) {
          return json(
            { ok: false, error: "content_too_short", message: "`content` must be at least 20 characters of verbatim file text." },
            400,
          );
        }
        if (content.length > 120_000) {
          return json(
            { ok: false, error: "content_too_long", message: "`content` exceeds 120000 characters. Split the file." },
            413,
          );
        }

        const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : "untitled";
        const type = typeof body.type === "string" && TYPES.has(body.type) ? body.type : "skill";
        const docClass =
          typeof body.doc_class === "string" && DOC_CLASSES.has(body.doc_class) ? body.doc_class : "auto";
        const semanticCheck = body.semantic_check === false ? false : true;
        const language =
          typeof body.language === "string" && LANGS.has(body.language) ? body.language : undefined;

        try {
          const core = await computeReview({
            name,
            type: type as "skill" | "playbook" | "soul" | "guardrail",
            content,
            doc_class: docClass as "skill" | "governance" | "playbook-ops" | "guardrail-ops" | "auto",
            semantic_check: semanticCheck,
            language: language as "en" | "pt" | "es" | "fr" | "de" | "it" | undefined,
          });

          const ceiling = (core.doc_class as { expected_ceiling?: number } | undefined)?.expected_ceiling;
          const impact = projectImpact({
            score: core.verdict_score as number,
            targetScore: typeof ceiling === "number" ? ceiling : undefined,
            actionsCount: (core.top_actions as unknown[]).length,
            semanticPass: Boolean((core.semantic_pass as { ran?: boolean } | undefined)?.ran),
          });

          return json({
            ok: true,
            ...core,
            impact_projection: {
              ...impact,
              summary: projectionToText(impact),
              report_note:
                "Projected values on the public SAK outcome metrics if top_actions are applied. Interpolated from network anchors — an estimate, not a guarantee.",
            },
          });
        } catch (err) {
          console.error("[api/public/review] failed", err);
          return json(
            { ok: false, error: "review_failed", message: "The engine could not score this document. Retry once; if it persists the content may be malformed." },
            500,
          );
        }
      },
    },
  },
});
