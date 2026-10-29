import { hasProSubscription } from "@/lib/auth/pro-subscription.server";
import { decodeAgentBuild } from "@/lib/agents/build-data";
import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildFiles, buildMarkdown } from "@/lib/agents/factory-adapt";

const supabaseAdmin = _supabaseAdmin;

/**
 * Download of a customer-generated agent (Agent Factory).
 *
 * Same contract as the curated store download: bearer token in the header
 * (a plain <a download> cannot carry one, so the UI fetches and saves the blob),
 * paid plan verified server-side, and the row must belong to the caller.
 */
async function authorize(authHeader: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() ?? null;
  if (!token) return { ok: false as const, status: 401, msg: "Sign in required" };
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  const userId = u?.user?.id;
  if (!userId) return { ok: false as const, status: 401, msg: "Invalid session" };

  const active = await hasProSubscription(supabaseAdmin, userId);
  if (!active)
    return { ok: false as const, status: 402, msg: "Pro is required to download agents." };
  return { ok: true as const, userId };
}

export const Route = createFileRoute("/api/agents/build/$id/download/$ext")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const auth = await authorize(request.headers.get("authorization"));
        if (!auth.ok) return new Response(auth.msg, { status: auth.status });

        const { data: row } = await supabaseAdmin
          .from("agent_builds")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (!row) return new Response("Agent not found", { status: 404 });
        if (row.status !== "ready")
          return new Response("This agent is still building.", { status: 409 });

        try {
          await supabaseAdmin.from("mcp_funnel_events").insert({
            event: "agent_build_download",
            user_id: auth.userId,
            props: { slug: row.slug, ext: params.ext },
          });
        } catch {
          /* ignore */
        }

        if (params.ext === "md") {
          return new Response(buildMarkdown(decodeAgentBuild(row)), {
            headers: {
              "content-type": "text/markdown; charset=utf-8",
              "content-disposition": `attachment; filename="${row.slug}-agent.md"`,
            },
          });
        }

        if (params.ext === "zip") {
          const zip = new JSZip();
          const root = zip.folder(`${row.slug}-agent`)!;
          for (const [path, content] of Object.entries(buildFiles(decodeAgentBuild(row))))
            root.file(path, content);
          const buf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
          return new Response(buf, {
            headers: {
              "content-type": "application/zip",
              "content-disposition": `attachment; filename="${row.slug}-agent.zip"`,
            },
          });
        }

        return new Response("Unsupported format. Use zip or md.", { status: 400 });
      },
    },
  },
});
