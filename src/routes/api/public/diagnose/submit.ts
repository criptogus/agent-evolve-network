import { createFileRoute } from "@tanstack/react-router";
import { submitExam } from "@/lib/university/university.server";
import { ERROR_CLASSES, ERROR_CLASS_LABEL, type DomainId } from "@/lib/university/types";

/** Plain-JSON scoring of an exam transcript (step 2). Deterministic, no LLM. */

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

export const Route = createFileRoute("/api/public/diagnose/submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/diagnose/submit",
          method: "POST",
          body_schema: {
            diagnosis_id: "string (optional) — from /diagnose/start; omit for a stateless score",
            domain: "gtm | engineering | support | finance | data | marketing | b2b_sales | customer_success | pricing | strategy | project_management | people_ops | legal_compliance | corporate_finance | agentic_crm | supply_chain | data_engineering | social_media | google_ads | meta_ads | linkedin_ads | digital_product | complex_software | tools_mcp | cybersecurity (optional when diagnosis_id is set)",
            installed_skills: "string[] (optional)",
            answers: "[{ case_id, answer, latency_ms?, tokens? }] — 1 to 80 items",
          },
          error_classes: ERROR_CLASSES.map((ec) => ({ id: ec, label: ERROR_CLASS_LABEL[ec] })),
          next: "POST /api/public/curriculum/next with { diagnosis_id }",
        }),

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const raw = Array.isArray(body.answers) ? (body.answers as any[]) : [];
        if (!raw.length) return json({ ok: false, error: "answers_required" }, 400);
        if (raw.length > 80) return json({ ok: false, error: "too_many_answers", max: 80 }, 400);

        const answers = raw
          .filter((a) => a && typeof a.case_id === "string")
          .map((a) => ({
            case_id: String(a.case_id),
            answer: String(a.answer ?? "").slice(0, 20000),
            latency_ms: Number.isFinite(a.latency_ms) ? Number(a.latency_ms) : undefined,
            tokens: Number.isFinite(a.tokens) ? Number(a.tokens) : undefined,
          }));
        if (!answers.length) return json({ ok: false, error: "answers_invalid" }, 400);

        try {
          const report = await submitExam({
            diagnosisId: typeof body.diagnosis_id === "string" ? body.diagnosis_id : null,
            domain: typeof body.domain === "string" ? (body.domain as DomainId) : undefined,
            answers,
            installedSkills: Array.isArray(body.installed_skills)
              ? (body.installed_skills as unknown[]).slice(0, 64).map(String)
              : [],
          });
          return json({ ok: true, ...report });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "error";
          if (msg === "unknown_domain") {
            return json(
              { ok: false, error: "unknown_domain", message: "Informe `domain` ou `diagnosis_id`, e case_ids válidos." },
              400,
            );
          }
          return json({ ok: false, error: "scoring_failed" }, 500);
        }
      },
    },
  },
});
