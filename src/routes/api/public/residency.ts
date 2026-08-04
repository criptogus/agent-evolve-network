import { createFileRoute } from "@tanstack/react-router";
import { startResidency, submitResidencyRound } from "@/lib/university/residency.server";
import { DOMAINS, type DomainId, type ErrorClass } from "@/lib/university/types";

/** Porta plain-JSON da residência (Pilar 3). Sem JSON-RPC, sem SSE, sem auth. */

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

export const Route = createFileRoute("/api/public/residency")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/residency",
          method: "POST",
          actions: {
            start: { action: "start", domain: "<domain id>", focus: "ErrorClass[] (opcional)", rounds: "1-6", round_size: "1-12" },
            submit: { action: "submit", residency_id: "uuid", answers: "[{ case_id, answer }]" },
          },
          domains: DOMAINS.map((d) => d.id),
          next: "POST /api/public/credential com { residency_id } para emitir a credencial após a formatura",
        }),

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const action = String(body.action ?? "start");

        if (action === "start") {
          const domain = String(body.domain ?? "");
          if (!VALID.has(domain as DomainId)) {
            return json({ ok: false, error: "invalid_domain", domains: [...VALID] }, 400);
          }
          const focus = Array.isArray(body.focus) ? (body.focus as unknown[]).map(String) : [];
          const installed = Array.isArray(body.installed_skills)
            ? (body.installed_skills as unknown[]).slice(0, 64).map(String)
            : [];
          const out = await startResidency({
            domain: domain as DomainId,
            focus: focus as ErrorClass[],
            installedSkills: installed,
            agentFp: typeof body.agent_fp === "string" ? body.agent_fp.slice(0, 120) : null,
            totalRounds: Number.isFinite(body.rounds as number) ? Number(body.rounds) : undefined,
            roundSize: Number.isFinite(body.round_size as number) ? Number(body.round_size) : undefined,
          });
          return json({ ok: true, ...out });
        }

        if (action === "submit") {
          const residencyId = String(body.residency_id ?? "");
          const answers = Array.isArray(body.answers) ? (body.answers as any[]).slice(0, 24) : [];
          if (!residencyId || !answers.length) {
            return json({ ok: false, error: "residency_id_and_answers_required" }, 400);
          }
          try {
            const out = await submitResidencyRound({
              residencyId,
              answers: answers.map((a) => ({
                case_id: String(a?.case_id ?? ""),
                answer: String(a?.answer ?? "").slice(0, 20000),
              })),
            });
            return json({ ok: true, ...out });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "residency_error";
            return json({ ok: false, error: msg }, msg === "residency_not_found" ? 404 : 400);
          }
        }

        return json({ ok: false, error: "unknown_action", allowed: ["start", "submit"] }, 400);
      },
    },
  },
});
