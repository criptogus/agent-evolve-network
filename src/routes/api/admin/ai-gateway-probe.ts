import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { describeGatewayConfig, getGatewayModel } from "@/lib/ai-gateway";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

// Admin-only diagnostic. Returns:
//  - which env var supplied the gateway key (or "configured: false")
//  - which base URL the SDK will use
//  - whether a 1-token round-trip to the default model succeeds, plus
//    the latency and any error returned by the provider.
//
// Use it from /admin to figure out *exactly* what's wrong when the
// SkillForge author pipeline misbehaves. Auth: admin role required.

async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function resolveUserFromAuthHeader(req: Request): Promise<string | null> {
  // Cookie session — handled by Supabase auth middleware on most routes,
  // but for a one-off API we just trust the supabase session JWT cookie.
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    try {
      const { data } = await supabaseAdmin.auth.getUser(token);
      return data?.user?.id ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

async function handle(req: Request): Promise<Response> {
  const userId = await resolveUserFromAuthHeader(req);
  if (!(await isAdmin(userId))) {
    return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const cfg = describeGatewayConfig();
  const probe: {
    config: typeof cfg;
    probe?: { ok: boolean; ms: number; text?: string; error?: string };
  } = { config: cfg };

  if (cfg.configured) {
    const t0 = Date.now();
    try {
      const r = await generateText({
        model: getGatewayModel("default"),
        prompt: "Reply with the single word: ok",
        // keep cost trivial — we just want a successful HTTP round-trip
      });
      probe.probe = { ok: true, ms: Date.now() - t0, text: r.text.slice(0, 80) };
    } catch (e: any) {
      probe.probe = { ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
    }
  }

  return new Response(JSON.stringify(probe, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/admin/ai-gateway-probe")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
    },
  },
});
