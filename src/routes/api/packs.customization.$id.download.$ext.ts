import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

async function loadCustomization(id: string, authHeader: string | null) {
  // Verify owner using bearer
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? null;
  if (!token) return { ok: false as const, status: 401, msg: "Sign in required" };
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  if (!u?.user) return { ok: false as const, status: 401, msg: "Invalid session" };
  const { data: row } = await supabaseAdmin
    .from("pack_customizations")
    .select("*")
    .eq("id", id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!row) return { ok: false as const, status: 404, msg: "Not found" };
  if (row.status !== "ready") return { ok: false as const, status: 409, msg: "Not ready" };
  const { data: pack } = await supabaseAdmin.from("packs").select("name, slug, theme").eq("id", row.pack_id).single();
  return { ok: true as const, row, pack };
}

export const Route = createFileRoute("/api/packs/customization/$id/download/$ext")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const r = await loadCustomization(params.id, request.headers.get("authorization"));
        if (!r.ok) return new Response(r.msg, { status: r.status });
        const { row, pack } = r;
        const items = (row.items ?? []) as any[];
        if (params.ext === "json") {
          const body = {
            pack: { slug: pack?.slug, name: pack?.name, theme: pack?.theme },
            brief: row.brief,
            niche: row.niche,
            audience: row.audience,
            voice: row.voice,
            research_summary: row.research_summary,
            research_sources: row.research_sources,
            items,
            generated_at: new Date().toISOString(),
          };
          return new Response(JSON.stringify(body, null, 2), {
            headers: {
              "content-type": "application/json",
              "content-disposition": `attachment; filename="${pack?.slug}-customized.json"`,
            },
          });
        }
        // markdown bundle
        const lines: string[] = [];
        lines.push(`# ${pack?.name} — customized`);
        lines.push(`> Theme: ${pack?.theme}  •  Niche: ${row.niche || "(none)"}  •  Audience: ${row.audience || "(none)"}`);
        lines.push("");
        lines.push("## Brief");
        lines.push(row.brief);
        lines.push("");
        lines.push("## State of the art (anchor)");
        lines.push(row.research_summary || "");
        if (Array.isArray(row.research_sources) && row.research_sources.length) {
          lines.push("");
          lines.push("**References**");
          for (const s of row.research_sources as any[]) lines.push(`- ${s.title} — ${s.ref}`);
        }
        for (const it of items) {
          lines.push("");
          lines.push("---");
          lines.push(`## ${it.name} (${it.type} • ${it.role})`);
          if (it.customization_notes) lines.push(`*${it.customization_notes}*`);
          lines.push("");
          lines.push("```");
          lines.push(it.customized_system_prompt || "");
          lines.push("```");
          if (it.preserved_rules?.length) {
            lines.push("**Preserved rules**");
            for (const r of it.preserved_rules) lines.push(`- ${r}`);
          }
          if (it.added_rules?.length) {
            lines.push("**Added rules**");
            for (const r of it.added_rules) lines.push(`- ${r}`);
          }
        }
        return new Response(lines.join("\n"), {
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "content-disposition": `attachment; filename="${pack?.slug}-customized.md"`,
          },
        });
      },
    },
  },
});
