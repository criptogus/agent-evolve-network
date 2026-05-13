import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { getOrGenerateBody } from "@/lib/share/share-promo.functions";

const MAX_PER_RUN = 25;
const REFRESH_AFTER_DAYS = 30;

type Item = {
  type: "skill" | "playbook" | "soul" | "guardrail" | "pack";
  slug: string;
  name: string;
  description: string;
};

async function collectItems(): Promise<Item[]> {
  const items: Item[] = [];

  const { data: pkgs } = await supabaseAdmin
    .from("packages")
    .select("slug,name,description,type")
    .eq("is_published", true)
    .eq("review_status", "approved")
    .limit(2000);
  for (const p of pkgs ?? []) {
    items.push({
      type: p.type as Item["type"],
      slug: p.slug,
      name: p.name,
      description: p.description ?? p.name,
    });
  }

  const { data: packs } = await supabaseAdmin
    .from("packs")
    .select("slug,name,description")
    .eq("is_published", true)
    .eq("review_status", "approved")
    .limit(2000);
  for (const p of packs ?? []) {
    items.push({
      type: "pack",
      slug: p.slug,
      name: p.name,
      description: p.description ?? p.name,
    });
  }

  return items;
}

export const Route = createFileRoute("/api/public/hooks/prewarm-share-promos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require Supabase anon key in `apikey` header (matches pg_cron pattern)
        const apikey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const items = await collectItems();
        const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 86_400_000).toISOString();

        // Find which keys already have fresh cache
        const { data: existing } = await supabaseAdmin
          .from("share_promos")
          .select("type,slug,generated_at")
          .gt("generated_at", cutoff);
        const fresh = new Set((existing ?? []).map((r) => `${r.type}:${r.slug}`));

        const todo = items.filter((i) => !fresh.has(`${i.type}:${i.slug}`)).slice(0, MAX_PER_RUN);

        let ok = 0;
        const errors: string[] = [];
        for (const it of todo) {
          try {
            await getOrGenerateBody(it);
            ok += 1;
          } catch (e) {
            errors.push(`${it.type}:${it.slug} — ${(e as Error).message}`);
          }
        }

        return Response.json({
          total_items: items.length,
          fresh: fresh.size,
          processed: ok,
          remaining: Math.max(0, items.length - fresh.size - ok),
          errors,
        });
      },
    },
  },
});
