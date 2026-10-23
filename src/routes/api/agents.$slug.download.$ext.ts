import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { findAgent } from "@/lib/agents/catalog";
import { agentFiles, agentMarkdownBundle } from "@/lib/agents/bundle";

const supabaseAdmin = _supabaseAdmin as any;

/**
 * Pro-only agent bundle download.
 *
 * Auth: Supabase session bearer (the app passes it explicitly because a plain
 * <a download> cannot carry headers — the UI fetches with the header and turns
 * the blob into a download). Paid subscription is verified server-side; the
 * catalog content itself never ships to anonymous clients.
 */
async function authorize(authHeader: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() ?? null;
  if (!token) return { ok: false as const, status: 401, msg: "Sign in required" };
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  const userId = u?.user?.id;
  if (!userId) return { ok: false as const, status: 401, msg: "Invalid session" };

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) {
    return { ok: false as const, status: 402, msg: "A paid plan is required to download agents." };
  }
  return { ok: true as const, userId };
}

export const Route = createFileRoute("/api/agents/$slug/download/$ext")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const agent = findAgent(params.slug);
        if (!agent) return new Response("Agent not found", { status: 404 });

        const auth = await authorize(request.headers.get("authorization"));
        if (!auth.ok) return new Response(auth.msg, { status: auth.status });

        // best-effort usage log; never blocks the download
        try {
          await supabaseAdmin
            .from("mcp_funnel_events")
            .insert({ event: "agent_download", user_id: auth.userId, props: { slug: agent.slug, ext: params.ext } });
        } catch {
          /* ignore */
        }

        if (params.ext === "md") {
          return new Response(agentMarkdownBundle(agent), {
            headers: {
              "content-type": "text/markdown; charset=utf-8",
              "content-disposition": `attachment; filename="${agent.slug}-agent.md"`,
            },
          });
        }

        if (params.ext === "zip") {
          const zip = new JSZip();
          const root = zip.folder(`${agent.slug}-agent`)!;
          for (const [path, content] of Object.entries(agentFiles(agent))) root.file(path, content);
          const buf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
          return new Response(buf, {
            headers: {
              "content-type": "application/zip",
              "content-disposition": `attachment; filename="${agent.slug}-agent.zip"`,
            },
          });
        }

        return new Response("Unsupported format. Use zip or md.", { status: 400 });
      },
    },
  },
});
