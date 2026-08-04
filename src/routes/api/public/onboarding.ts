import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { classifyUserAgent } from "@/lib/telemetry/bot-detect";
import {
  checkEvidence,
  isStepId,
  nextStep,
  publicChecklist,
  STEPS,
} from "@/lib/onboarding/checklist";

/**
 * Verifiable agent onboarding.
 *
 * GET  -> the executable checklist (stages, steps, evidence shapes) + a fresh session.
 * POST -> submit evidence for one step. The server validates the evidence shape,
 *         verifies database-backed claims (does that package really exist?),
 *         records the completion and returns the next pending step.
 *
 * No auth, no PII: the session identifier is stored only as a salted hash, and
 * evidence is limited to the small declared shapes in the checklist module.
 */

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const bodySchema = z.object({
  session: z.string().trim().min(8).max(200),
  step_id: z.string().trim().min(2).max(40),
  evidence: z.record(z.unknown()).optional(),
  client_name: z.string().trim().max(120).optional(),
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers });
}

function hashSession(session: string) {
  return createHash("sha256").update(`sak-onboarding:${session}`).digest("hex").slice(0, 48);
}

function stageSummary() {
  return [
    { stage: "know", goal: "Understand the primitives and pick the right tool.", read: "https://superagentskill.com/agents.md" },
    { stage: "connect", goal: "Handshake, discover a capability, inspect it before adopting.", steps: STEPS.filter((s) => s.stage === "connect").map((s) => s.id) },
    { stage: "evolve", goal: "Evaluate, publish an improvement, diagnose and keep learning.", steps: STEPS.filter((s) => s.stage === "evolve").map((s) => s.id) },
  ];
}

export const Route = createFileRoute("/api/public/onboarding")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      HEAD: async () => new Response(null, { status: 200, headers }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const session = url.searchParams.get("session")?.trim() || randomUUID();
        let completed: string[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await (supabaseAdmin as any)
            .from("agent_onboarding_steps")
            .select("step_id")
            .eq("session_hash", hashSession(session));
          completed = (data ?? []).map((r: { step_id: string }) => r.step_id);
        } catch {
          completed = [];
        }
        const next = nextStep(completed);
        return json({
          ok: true,
          session,
          stages: stageSummary(),
          checklist: publicChecklist(),
          completed,
          next_step: next
            ? { step_id: next.id, stage: next.stage, title: next.title, action: next.action, evidence_shape: next.evidence }
            : null,
          done: next === null,
          submit: {
            method: "POST",
            url: "https://superagentskill.com/api/public/onboarding",
            body: { session, step_id: next?.id ?? "connect", evidence: {} },
          },
        });
      },

      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, error: "invalid_body", details: parsed.error.issues.slice(0, 5) }, 400);
        }
        const { session, step_id, evidence, client_name } = parsed.data;
        if (!isStepId(step_id)) {
          return json({ ok: false, error: "unknown_step", valid_steps: STEPS.map((s) => s.id) }, 400);
        }

        const check = checkEvidence(step_id, evidence);
        if (!check.ok) {
          return json({ ok: false, error: "evidence_rejected", step_id, reason: check.reason }, 422);
        }

        const ua = request.headers.get("user-agent");
        const cls = classifyUserAgent(ua);
        const sessionHash = hashSession(session);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;

          if (check.needsDb?.kind === "package") {
            const { data: pkg } = await db
              .from("packages")
              .select("slug")
              .eq("slug", check.needsDb.slug)
              .maybeSingle();
            if (!pkg) {
              return json(
                { ok: false, error: "evidence_rejected", step_id, reason: `no package with slug "${check.needsDb.slug}" — use a slug returned by search_registry` },
                422,
              );
            }
          }

          const step = STEPS.find((s) => s.id === step_id)!;
          await db.from("agent_onboarding_steps").upsert(
            {
              session_hash: sessionHash,
              step_id,
              stage: step.stage,
              client_name: client_name ?? null,
              ua_family: cls.family,
              is_bot: cls.isBot,
              evidence: (evidence ?? {}) as Record<string, unknown>,
            },
            { onConflict: "session_hash,step_id" },
          );

          const { data } = await db
            .from("agent_onboarding_steps")
            .select("step_id")
            .eq("session_hash", sessionHash);
          const completed = (data ?? []).map((r: { step_id: string }) => r.step_id);
          const next = nextStep(completed);

          return json({
            ok: true,
            session,
            verified: step_id,
            completed,
            progress: `${completed.length}/${STEPS.length}`,
            next_step: next
              ? { step_id: next.id, stage: next.stage, title: next.title, action: next.action, evidence_shape: next.evidence }
              : null,
            done: next === null,
            message: next
              ? `Step "${step_id}" verified. Next: ${next.title}.`
              : "Onboarding complete — you are connected, publishing and learning. Keep reporting outcomes with report_execution.",
          });
        } catch (err) {
          return json({ ok: false, error: "server_error", message: err instanceof Error ? err.message : "unknown" }, 500);
        }
      },
    },
  },
});
