import { createFileRoute } from "@tanstack/react-router";
import { issueCredential, verifyCredential } from "@/lib/university/residency.server";

/** Credenciais portáveis (Pilar 4): emissão e verificação pública. */

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

export const Route = createFileRoute("/api/public/credential")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const code = new URL(request.url).searchParams.get("code");
        if (!code) {
          return json({
            ok: true,
            endpoint: "/api/public/credential",
            verify: "GET ?code=SAK-XXXXXX-XXXXXX",
            issue: "POST { residency_id }",
          });
        }
        const result = await verifyCredential(code);
        return json(result, result.ok ? 200 : 404);
      },

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const residencyId = String(body.residency_id ?? "");
        if (!residencyId) return json({ ok: false, error: "residency_id_required" }, 400);
        try {
          const credential = await issueCredential(residencyId);
          return json({ ok: true, credential });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "credential_error";
          return json({ ok: false, error: msg }, msg === "residency_not_found" ? 404 : 400);
        }
      },
    },
  },
});
