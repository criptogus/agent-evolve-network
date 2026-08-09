/**
 * First-run experience tools.
 *
 * The #1 support question on the MCP endpoint is "am I actually connected, and
 * why is this tool refusing me?". `whoami` answers that in one cheap call.
 * `upload_status` closes the loop on queued uploads (previously the agent had
 * to send the user to the website), and `recommend_packages` brings the
 * marketplace's popularity-first ranking into MCP so agents stop surfacing
 * niche, stack-specific packages to new users.
 */
import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { rankRecommended, type RankableItem } from "@/lib/marketplace/recommend";
import type { ProjectType } from "@/lib/marketplace/project-profile";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);
const ORIGIN = "https://superagentskill.com";

function userIdOf(ctx: any): string | null {
  return (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
}

const LIMITS = {
  anonymous: { read_day: 20, read_hour: 8, write_day: 0 },
  trial: { read_day: 40, read_hour: 10, write_day: 5 },
  paid: { read_day: 5000, read_hour: 800, write_day: 300 },
} as const;

export const whoamiTool = defineTool({
  name: "whoami",
  description:
    "[START HERE] Connection self-check. Tells you whether this MCP session is authenticated, which tier/quota applies, whether write tools (upload_packages, install_agent, cloud_skills_*) are unlocked, and the exact next step to fix it if not. Free, read-only, never counts against quota. Call this FIRST whenever a tool returns unauthorized, subscription_required or a quota error.",
  parameters: z.object({}),
  execute: async (_input, ctx) => {
    const userId = userIdOf(ctx);
    if (!userId) {
      return json({
        connected: false,
        identity: "anonymous",
        tier: "anonymous",
        limits: LIMITS.anonymous,
        can_read_registry: true,
        can_write: false,
        can_use_agent_store: false,
        next_steps: [
          `Connect this client: run \`npx -y super-agent login\`, or open ${ORIGIN}/connect and follow the 3-step checklist for your client (Claude, Cursor, Codex, VS Code, Windsurf).`,
          `Already have an account? Paste a personal access token from ${ORIGIN}/account/tokens as \`Authorization: Bearer <token>\`.`,
          "Meanwhile you can already use: overview, whoami, search_registry, get_package, recommend_packages, review_skill, get_methodology, diagnose_start.",
        ],
        works_without_connecting: [
          "review_skill",
          "search_registry",
          "recommend_packages",
          "diagnose_start",
          "upload_packages (dry_run: true)",
        ],
      });
    }

    let email: string | null = null;
    let handle: string | null = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = authUser?.user?.email ?? null;
    } catch {
      /* best-effort */
    }
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("handle")
        .eq("id", userId)
        .maybeSingle();
      handle = profile?.handle ?? null;
    } catch {
      /* best-effort */
    }

    let paid = false;
    try {
      const { data } = await supabaseAdmin.rpc("has_active_subscription", { _user_id: userId } as never);
      paid = data === true;
    } catch {
      /* treat as trial */
    }
    const tier = paid ? "paid" : "trial";

    // Usage in the trailing 24h / 1h for this identity, read-only (no logging).
    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const since1 = new Date(Date.now() - 3600_000).toISOString();
    async function used(from: string, isWrite: boolean) {
      try {
        const { count } = await supabaseAdmin
          .from("mcp_call_log")
          .select("id", { count: "exact", head: true })
          .eq("identity", `u:${userId}`)
          .eq("is_write", isWrite)
          .gt("created_at", from);
        return count ?? 0;
      } catch {
        return null;
      }
    }
    const [readDay, readHour, writeDay] = await Promise.all([
      used(since24, false),
      used(since1, false),
      used(since24, true),
    ]);

    const limits = paid ? LIMITS.paid : LIMITS.trial;
    const nextSteps: string[] = [];
    if (!paid) {
      nextSteps.push(
        `You are on the free trial tier (${limits.read_day} reads/day, ${limits.write_day} writes/day). The Agent Store (install_agent) and the cloud skill library (cloud_skills_*) require Agent Pass — upgrade at ${ORIGIN}/pricing.`,
      );
    }
    nextSteps.push(
      "Typical first run: review_skill with the user's local SKILL.md → apply top_actions in the repo → review_skill again to confirm the grade went up.",
    );
    nextSteps.push("Not sure what to install? recommend_packages { project_type } returns popular, broadly useful packages.");

    return json({
      connected: true,
      identity: { user_id: userId, email, handle },
      auth_source: (ctx?.auth?.source as string | undefined) ?? "bearer",
      tier,
      limits,
      usage_last_24h: { reads: readDay, writes: writeDay },
      usage_last_hour: { reads: readHour },
      can_read_registry: true,
      can_write: true,
      can_use_agent_store: paid,
      can_use_cloud_skills: paid,
      next_steps: nextSteps,
      dashboard: `${ORIGIN}/home`,
    });
  },
});

export const uploadStatusTool = defineTool({
  name: "upload_status",
  description:
    "[PUBLISH] Check what happened to files sent through upload_packages. Pass `job_id` from the upload response, or omit it to get the caller's most recent upload jobs. Returns per-job status (queued | processing | done | failed), the resulting draft slug and the forge report URL, so you can report progress to the user without sending them to the website. Requires the OAuth bearer of the uploading account.",
  parameters: z.object({
    job_id: z.string().uuid().optional().describe("Job id returned in upload_packages `queued[].id` / `results[].job_id`."),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  execute: async ({ job_id, limit }, ctx) => {
    const userId = userIdOf(ctx);
    if (!userId)
      return json({
        error: "unauthorized",
        hint: "Call whoami to see how to connect. Upload jobs are private to the uploading account.",
      });

    let q = supabaseAdmin
      .from("package_upload_jobs")
      .select("id,filename,inferred_type,status,error,package_id,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(job_id ? 1 : limit);
    if (job_id) q = q.eq("id", job_id);
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    const jobs = data ?? [];
    if (job_id && jobs.length === 0)
      return json({ error: "not_found", hint: "That job id does not belong to this account." });

    // Resolve draft slugs for finished jobs so the agent can link the result.
    const pkgIds = jobs.map((j: any) => j.package_id).filter(Boolean);
    const slugById = new Map<string, string>();
    if (pkgIds.length) {
      const { data: pkgs } = await supabaseAdmin.from("packages").select("id,slug").in("id", pkgIds);
      for (const p of pkgs ?? []) slugById.set(p.id, p.slug);
    }

    const items = jobs.map((j: any) => {
      const slug = j.package_id ? (slugById.get(j.package_id) ?? null) : null;
      return {
        job_id: j.id,
        filename: j.filename,
        inferred_type: j.inferred_type,
        status: j.status,
        error: j.error ?? null,
        slug,
        forge_report_url: slug ? `${ORIGIN}/forge/report/${slug}` : null,
        created_at: j.created_at,
        updated_at: j.updated_at ?? null,
      };
    });
    const pending = items.filter((i) => i.status === "queued" || i.status === "processing").length;
    const failed = items.filter((i) => i.status === "failed");

    return json({
      count: items.length,
      pending,
      jobs: items,
      next_step:
        pending > 0
          ? "Still in the queue — the worker drains roughly once per minute. Call upload_status again in ~60s before telling the user anything failed."
          : failed.length > 0
            ? `Failed: ${failed.map((f) => `${f.filename} (${f.error ?? "unknown"})`).join(" · ")}. Fix the file locally and call upload_packages again with a NEW idempotency_key.`
            : `All done. Drafts are PRIVATE — the author lists them publicly from ${ORIGIN}/account/packages.`,
    });
  },
});

export const recommendPackagesTool = defineTool({
  name: "recommend_packages",
  description:
    "[DISCOVER] Best first-install suggestions. Ranks the registry by real popularity (installs + rated reviews) with Trust Score as a quality floor, demotes narrow stack-specific packages (Expo/EAS, Kubernetes, SAML, FHIR…), and optionally biases toward what the user is building. Prefer this over list_packages when the user has NOT named a specific topic. Read-only, no auth.",
  parameters: z.object({
    project_type: z
      .enum(["web-app", "api-service", "mcp-agent", "backend-data"])
      .optional()
      .describe("What the user is building. Biases ranking toward packages that fit that shape."),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    limit: z.number().int().min(1).max(20).default(6),
  }),
  execute: async ({ project_type, type, limit }) => {
    let q = supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,latest_version,author_handle,install_count")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .limit(400);
    if (type) q = q.eq("type", type);
    const { data: pkgs, error } = await q;
    if (error) return json({ error: error.message });
    const rows = pkgs ?? [];
    const ids = rows.map((p: any) => p.id);

    const rating = new Map<string, { sum: number; count: number }>();
    const trust = new Map<string, number | null>();
    if (ids.length) {
      const [{ data: reviews }, { data: scores }] = await Promise.all([
        supabaseAdmin.from("reviews").select("package_id,rating").in("package_id", ids),
        supabaseAdmin.from("package_trust_scores").select("package_id,score").in("package_id", ids),
      ]);
      for (const r of reviews ?? []) {
        const cur = rating.get(r.package_id) ?? { sum: 0, count: 0 };
        cur.sum += r.rating;
        cur.count += 1;
        rating.set(r.package_id, cur);
      }
      for (const s of scores ?? []) {
        const n = s.score == null ? null : Number(s.score);
        trust.set(s.package_id, n != null && Number.isFinite(n) ? n : null);
      }
    }

    const rankable: (RankableItem & { latest_version: string; author_handle: string | null })[] = rows.map(
      (p: any) => {
        const rt = rating.get(p.id) ?? { sum: 0, count: 0 };
        return {
          slug: p.slug,
          name: p.name,
          description: p.description ?? "",
          type: p.type,
          install_count: p.install_count ?? 0,
          rating_avg: rt.count ? rt.sum / rt.count : 0,
          rating_count: rt.count,
          trust_score: trust.get(p.id) ?? null,
          latest_version: p.latest_version,
          author_handle: p.author_handle ?? null,
        };
      },
    );

    const ranked = rankRecommended(rankable, limit, (project_type as ProjectType | undefined) ?? null);
    return json({
      project_type: project_type ?? null,
      ranking: "popularity-first (installs + rated reviews), Trust Score >= 0.4 floor, niche packages demoted",
      count: ranked.length,
      items: ranked.map((i) => ({
        slug: i.slug,
        name: i.name,
        type: i.type,
        description: i.description,
        latest_version: i.latest_version,
        author_handle: i.author_handle,
        install_count: i.install_count,
        rating: i.rating_count ? { avg: Math.round(i.rating_avg * 100) / 100, count: i.rating_count } : null,
        trust_score: i.trust_score,
      })),
      next_step:
        ranked.length > 0
          ? `get_package { slug: "${ranked[0]!.slug}" } for the full manifest, then get_skill_trust before recommending it to the user.`
          : "Nothing matched — fall back to search_registry with a domain keyword.",
    });
  },
});
