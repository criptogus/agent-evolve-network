import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import type { Package, PackageVersion, CompatibilityCheck } from "@/data/packages";

const detailCache = createTtlCache<{ pkg: Package } | null>(5 * 60 * 1000, { max: 500 });

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function asArr<T = unknown>(x: unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function normCompat(raw: unknown): CompatibilityCheck[] {
  const out: CompatibilityCheck[] = [];
  for (const v of asArr<Record<string, unknown>>(raw)) {
    const runtime = String(v.runtime ?? v.name ?? v.model ?? "").trim();
    if (!runtime) continue;
    const statusRaw = String(v.status ?? "supported").toLowerCase();
    const status: CompatibilityCheck["status"] =
      statusRaw === "partial" || statusRaw === "unsupported" ? statusRaw : "supported";
    out.push({
      runtime,
      status,
      detail: String(v.detail ?? v.notes ?? "Verified."),
    });
  }
  return out;
}

function normExamples(raw: unknown): Package["examples"] {
  const out: Package["examples"] = [];
  for (const v of asArr<Record<string, unknown>>(raw)) {
    const title = String(v.title ?? v.name ?? "Example").trim();
    const body = String(v.body ?? v.input ?? v.text ?? "").trim();
    if (body) out.push({ title, body });
  }
  return out;
}

export const getPackageDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<{ pkg: Package } | null> => {
    return detailCache.getOrLoad(data.slug, async () => {
    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, long_description, author_handle, author_verified, install_count, latest_version, price_credits, license, scopes, is_published, review_status"
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!pkg || !pkg.is_published || pkg.review_status !== "approved") return null;

    const { data: versions } = await supabaseAdmin
      .from("package_versions")
      .select("version, status, notes, created_at, examples, compatibility, rules, permissions, system_prompt")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false });

    const vers = versions ?? [];
    const latest = vers.find((v) => v.version === pkg.latest_version) ?? vers[0];

    const versionList: PackageVersion[] = vers.map((v) => ({
      version: v.version,
      date: fmtDate(v.created_at as string),
      status: (v.status as PackageVersion["status"]) ?? "stable",
      notes: (v.notes as string) ?? "",
    }));

    const compatibility = latest ? normCompat(latest.compatibility) : [];
    const examples = latest ? normExamples(latest.examples) : [];
    const rules = (latest?.rules ?? {}) as Record<string, unknown>;
    const versionPerms = asArr<string>(latest?.permissions).filter((s): s is string => typeof s === "string");
    const pkgScopes = Array.isArray(pkg.scopes) ? (pkg.scopes as string[]) : [];
    const scopes = versionPerms.length ? versionPerms : pkgScopes;

    // ratings + reviews count via reviews aggregate
    const { data: rs } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("package_id", pkg.id);
    const reviewCount = rs?.length ?? 0;
    const ratingAvg =
      reviewCount > 0
        ? Math.round((rs!.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount) * 10) / 10
        : 0;

    const dependencies = asArr<Record<string, unknown>>(rules.dependencies).map((d) => ({
      name: String(d.name ?? d.slug ?? "dependency"),
      version: String(d.version ?? "*"),
    }));

    const out: Package = {
      id: pkg.slug,
      name: pkg.name,
      type: pkg.type as Package["type"],
      author: pkg.author_handle ?? "@unknown",
      authorVerified: !!pkg.author_verified,
      downloads: fmtCount(pkg.install_count ?? 0),
      rating: ratingAvg,
      reviews: reviewCount,
      description: pkg.description ?? "",
      longDescription: pkg.long_description ?? pkg.description ?? "",
      latest: pkg.latest_version,
      versions: versionList.length ? versionList : [{ version: pkg.latest_version, date: "—", status: "stable", notes: "" }],
      compatibility,
      dependencies,
      scopes: scopes.length ? scopes : ["registry:read"],
      size: "—",
      license: (pkg.license as string) ?? "—",
      examples,
      metrics: [],
      vertical: typeof rules.vertical === "string" ? (rules.vertical as string) : undefined,
      reviewStatus: (pkg.review_status as string) ?? undefined,
      systemPrompt: typeof latest?.system_prompt === "string" ? (latest.system_prompt as string) : undefined,
    };
    return { pkg: out };
    });
  });

