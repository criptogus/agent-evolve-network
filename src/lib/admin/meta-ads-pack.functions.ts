import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware";
import { generateDraft, insertDraftPackage } from "./author.server";
import { BLUEPRINTS, META_ADS_MCP, buildGroundingForBlueprint, categoryByKey } from "./meta-ads-tools";

const PACK_SLUG = "meta-ads-pack";
const PACK_NAME = "Meta Ads Pack — 135 Tool-Grounded Primitives";

// ---------- LIST: blueprints + which already exist in DB ----------
export const listMetaAdsBlueprints = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const slugs = BLUEPRINTS.map((b) => b.slug);
    const { data: existing } = await supabase
      .from("packages")
      .select("id, slug, name, type, latest_version, is_published")
      .in("slug", slugs);
    const bySlug = new Map<string, any>((existing ?? []).map((p: any) => [p.slug, p]));

    const { data: pack } = await supabase
      .from("packs")
      .select("id, slug, name, latest_version, is_published")
      .eq("slug", PACK_SLUG)
      .maybeSingle();

    return {
      pack,
      blueprints: BLUEPRINTS.map((bp) => ({
        ...bp,
        existing: bySlug.get(bp.slug) ?? null,
      })),
    };
  });

// ---------- GENERATE one blueprint into a real package ----------
const GenInput = z.object({
  blueprint_id: z.string().min(1),
  publish: z.boolean().default(true),
  overwrite: z.boolean().default(false),
});

export const generateMetaAdsBlueprint = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const bp = BLUEPRINTS.find((b) => b.id === data.blueprint_id);
    if (!bp) throw new Response(`Unknown blueprint: ${data.blueprint_id}`, { status: 400 });

    // If already exists and not overwrite → skip
    const { data: existing } = await supabase
      .from("packages")
      .select("id, slug")
      .eq("slug", bp.slug)
      .maybeSingle();
    if (existing && !data.overwrite) {
      return { status: "exists" as const, package_id: existing.id, slug: existing.slug };
    }

    // 1) Generate draft grounded in the meta-ads tool catalog
    const grounding = buildGroundingForBlueprint(bp);
    const draft = await generateDraft(bp.brief, bp.type, "Meta Ads / Paid Social", grounding);

    // Force the slug we want (so the pack assembly is deterministic)
    draft.slug = bp.slug;
    draft.name = bp.name;
    draft.type = bp.type;

    // Inject MCP server dependency, permissions and live resources
    draft.mcp_servers = [
      {
        name: META_ADS_MCP.name,
        transport: META_ADS_MCP.transport,
        command: META_ADS_MCP.command,
        args: META_ADS_MCP.args,
        env: META_ADS_MCP.env,
        scopes: META_ADS_MCP.scopes,
        required: true,
        description: META_ADS_MCP.description,
      },
    ];
    draft.permissions = META_ADS_MCP.scopes.map((s) => ({
      scope: s,
      reason: `Required by meta-ads-mcp for ${bp.name}`,
      required: true,
    }));
    draft.live_resources = (bp.resources ?? []).map((uri) => ({
      uri,
      kind: "mcp" as const,
      purpose: `Live data for ${bp.name}`,
      refresh: "on_call" as const,
      required: false,
    }));

    // 2) If overwriting an existing slug, delete it first (cascade kills versions)
    if (existing && data.overwrite) {
      await supabase.from("packages").delete().eq("id", existing.id);
    }

    // 3) Insert package + version (insertDraftPackage handles slug uniqueness fallback)
    const pkg = await insertDraftPackage(supabase, userId, draft, {
      source_kind: "wizard",
      source_ref: `meta-ads-mcp:${bp.id}`,
    });
    // insertDraftPackage always creates a private, unverified draft. This is an
    // admin-only (requireAdmin) flow, so publishing is an explicit, authorized
    // step — the DB trust-column trigger permits it because auth.uid() is an
    // admin here.
    if (data.publish) {
      await supabase
        .from("packages")
        .update({ is_published: true, review_status: "approved" })
        .eq("id", pkg.id);
    }

    // 4) Patch the version row with mcp_servers / permissions / live_resources columns
    //    (insertDraftPackage's INSERT only writes the core version fields).
    await supabase
      .from("package_versions")
      .update({
        mcp_servers: draft.mcp_servers,
        permissions: draft.permissions,
        live_resources: draft.live_resources,
      })
      .eq("package_id", pkg.id)
      .eq("version", "0.1.0");

    return {
      status: existing ? ("replaced" as const) : ("created" as const),
      package_id: pkg.id,
      slug: pkg.slug,
      name: pkg.name,
      type: pkg.type,
    };
  });

// ---------- ASSEMBLE the pack itself ----------
export const assembleMetaAdsPack = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;

    // Load all generated packages by slug
    const slugs = BLUEPRINTS.map((b) => b.slug);
    const { data: pkgs, error: pkgErr } = await supabase
      .from("packages")
      .select("id, slug, type")
      .in("slug", slugs);
    if (pkgErr) throw new Response(pkgErr.message, { status: 500 });

    const found = pkgs ?? [];
    const missing = BLUEPRINTS.filter((b) => !found.some((p: any) => p.slug === b.slug));
    if (missing.length > 0) {
      return { status: "incomplete" as const, missing: missing.map((m) => m.id) };
    }

    // Upsert the pack
    const description =
      "Production-ready Meta Ads pack: 15 tool-grounded skills (one per Meta category), 4 multi-step playbooks, 1 senior-marketer soul and 2 guardrails — all wired to the meta-ads-mcp server (135 tools, Meta Marketing API v25.0).";
    const long_description =
      "Every primitive in this pack only calls real meta-ads-mcp tools (no hallucinations). Ships with explicit MCP server dependency, OAuth scopes (ads_management, ads_read, business_management, leads_retrieval, catalog_management) and live resource hints. After purchase you can customize the entire pack to your vertical (e-commerce, lead-gen, app installs…) before download.";

    let packId: string;
    const { data: existingPack } = await supabase
      .from("packs")
      .select("id")
      .eq("slug", PACK_SLUG)
      .maybeSingle();

    if (existingPack) {
      packId = existingPack.id;
      await supabase
        .from("packs")
        .update({
          name: PACK_NAME,
          theme: "meta-ads",
          description,
          long_description,
          cover_emoji: "📈",
          price_credits: 250,
          author_id: userId,
          is_published: true,
          review_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", packId);
      // wipe items so re-assembly stays in sync
      await supabase.from("pack_items").delete().eq("pack_id", packId);
    } else {
      const { data: created, error } = await supabase
        .from("packs")
        .insert({
          slug: PACK_SLUG,
          name: PACK_NAME,
          theme: "meta-ads",
          description,
          long_description,
          cover_emoji: "📈",
          price_credits: 250,
          author_id: userId,
          author_handle: "@superagentskill",
          is_published: true,
          review_status: "approved",
        })
        .select("id")
        .single();
      if (error) throw new Response(error.message, { status: 500 });
      packId = created.id;
    }

    const items = BLUEPRINTS.map((bp, i) => {
      const pkg = found.find((p: any) => p.slug === bp.slug)!;
      return {
        pack_id: packId,
        package_id: pkg.id,
        // souls + guardrails are core layers; skills/playbooks are core too — everything is core for v0.1
        role: "core" as const,
        sort_order: i,
      };
    });
    const { error: itemErr } = await supabase.from("pack_items").insert(items);
    if (itemErr) throw new Response(itemErr.message, { status: 500 });

    return { status: "ready" as const, pack_id: packId, items: items.length, slug: PACK_SLUG };
  });
