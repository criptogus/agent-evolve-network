import { createFileRoute } from "@tanstack/react-router";
import { getDiagnosisForCurriculum } from "@/lib/university/university.server";
import { planCurriculum } from "@/lib/university/curriculum";
import { ERROR_CLASSES, DOMAINS, type DomainId, type ErrorClass } from "@/lib/university/types";

/** Plain-JSON `curriculum.next()` — marginal gain, not a catalog listing. */

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

const VALID_CLASSES = new Set<string>(ERROR_CLASSES);

export const Route = createFileRoute("/api/public/curriculum/next")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/curriculum/next",
          method: "POST",
          body_schema: {
            diagnosis_id: "string (optional) — reads the error profile from the exam",
            domain: "gtm | engineering | support | finance | data (optional)",
            failing: `${ERROR_CLASSES.join(" | ")} (array, optional when diagnosis_id is set)`,
            installed_skills: "string[] — what the agent already carries",
            budget: "number (optional, default 12) — max capabilities this agent should carry",
          },
          domains: DOMAINS,
          note: "Above the context budget the response recommends removing a capability instead of adding one.",
        }),

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }

        let profile: any[] | undefined;
        let installed = Array.isArray(body.installed_skills)
          ? (body.installed_skills as unknown[]).slice(0, 64).map(String)
          : [];
        let domain = typeof body.domain === "string" ? (body.domain as DomainId) : undefined;

        if (typeof body.diagnosis_id === "string") {
          const d = await getDiagnosisForCurriculum(body.diagnosis_id);
          if (d) {
            profile = d.error_profile;
            domain = domain ?? d.domain;
            if (!installed.length) installed = d.installed_skills;
          }
        }

        const manual = (Array.isArray(body.failing) ? (body.failing as unknown[]) : [])
          .map(String)
          .filter((x) => VALID_CLASSES.has(x)) as ErrorClass[];
        const failing = ((profile ?? [])
          .filter((p) => (p?.failed ?? 0) > 0)
          .map((p) => p.error_class as ErrorClass)).concat(manual);

        if (!failing.length) {
          return json(
            {
              ok: false,
              error: "no_error_profile",
              message:
                "Rode /api/public/diagnose/start e /submit primeiro, ou informe `failing`. Prescrição sem diagnóstico é catálogo, não currículo.",
            },
            400,
          );
        }

        const budget = Number.isFinite(body.budget as number)
          ? Math.max(1, Math.min(60, Number(body.budget)))
          : undefined;

        return json({ ok: true, ...planCurriculum({ failing, profile, installed, domain, budget }) });
      },
    },
  },
});
