/**
 * Second-connection-onward experience.
 *
 * `whoami` answers "am I connected?" for the first run. Returning sessions have
 * a different problem: the agent lost all context between sessions and has no
 * cheap way to know what the user already has, what changed on the platform,
 * or what the highest-value next move is. These three tools close that loop:
 *
 *  - `resume_session`  → the account's live workspace snapshot + ranked next actions
 *  - `whats_new`       → registry/platform/account changes since a timestamp
 *  - `check_updates`   → which locally installed packages are outdated
 */
import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLATFORM_VERSION, PLATFORM_CODENAME } from "@/lib/version";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);
const ORIGIN = "https://superagentskill.com";

function userIdOf(ctx: any): string | null {
  return (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
}

const unauth = () =>
  json({
    error: "unauthorized",
    hint: "This tool reports the state of a specific account. Call `whoami` for the exact way to connect this client.",
  });

export const resumeSessionTool = defineTool({
  name: "resume_session",
  description:
    "[RETURNING SESSION — START HERE ON EVERY NEW SESSION] Workspace snapshot for an already-connected account: skills under review, upload jobs still running, cloud skill library, agents built, last University diagnosis and its prescription, plus the score trend of every document reviewed recently. Ends with `next_actions`, a ranked list of the highest-value moves for THIS account (not generic advice). Free, read-only, never counts against quota. Call it once at the start of a session instead of asking the user what they were doing.",
  parameters: z.object({
    lookback_days: z.number().int().min(1).max(90).default(14),
  }),
  execute: async ({ lookback_days }, ctx) => {
    const userId = userIdOf(ctx);
    if (!userId) return unauth();
    const since = new Date(Date.now() - lookback_days * 86400_000).toISOString();

    const safe = async <T>(p: Promise<{ data: T | null }>): Promise<T | null> => {
      try {
        return (await p).data ?? null;
      } catch {
        return null;
      }
    };

    const [pkgs, jobs, cloud, builds, diagnosis, runs, sub] = await Promise.all([
      safe(
        supabaseAdmin
          .from("packages")
          .select("slug,name,type,review_status,is_published,install_count,star_count,latest_version,updated_at")
          .eq("author_id", userId)
          .order("updated_at", { ascending: false })
          .limit(50),
      ),
      safe(
        supabaseAdmin
          .from("package_upload_jobs")
          .select("id,filename,status,error,created_at")
          .eq("user_id", userId)
          .in("status", ["queued", "processing", "failed"])
          .order("created_at", { ascending: false })
          .limit(10),
      ),
      safe(
        supabaseAdmin
          .from("cloud_skills")
          .select("slug,name,version,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(10),
      ),
      safe(
        supabaseAdmin
          .from("agent_builds")
          .select("id,slug,name,status,grade,score,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(10),
      ),
      safe(
        supabaseAdmin
          .from("agent_diagnoses")
          .select("id,domain,status,overall_score,bottleneck,prescription,error_profile,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ),
      safe(
        supabaseAdmin
          .from("skill_review_runs")
          .select("doc_key,overall_score,grade,created_at")
          .eq("user_id", userId)
          .gt("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
      ),
      (async () => {
        try {
          const { data } = await supabaseAdmin.rpc("has_active_subscription", { _user_id: userId } as never);
          return data === true;
        } catch {
          return false;
        }
      })(),
    ]);

    // Score trend per reviewed document: first vs latest run in the window.
    const byDoc = new Map<string, { first: any; latest: any; runs: number }>();
    for (const r of (runs ?? []) as any[]) {
      const cur = byDoc.get(r.doc_key);
      if (!cur) byDoc.set(r.doc_key, { first: r, latest: r, runs: 1 });
      else {
        cur.first = r; // rows come newest-first, so the last seen is the oldest
        cur.runs += 1;
      }
    }
    const inProgress = [...byDoc.entries()]
      .map(([doc_key, v]) => ({
        doc_key,
        runs: v.runs,
        first_score: v.first.overall_score,
        latest_score: v.latest.overall_score,
        latest_grade: v.latest.grade,
        change: v.latest.overall_score - v.first.overall_score,
        last_reviewed_at: v.latest.created_at,
      }))
      .sort((a, b) => (a.last_reviewed_at < b.last_reviewed_at ? 1 : -1))
      .slice(0, 12);

    const myPkgs = (pkgs ?? []) as any[];
    const drafts = myPkgs.filter((p) => !p.is_published);
    const pendingReview = myPkgs.filter((p) => p.review_status === "pending" || p.review_status === "submitted");
    const changesRequested = myPkgs.filter((p) => p.review_status === "rejected" || p.review_status === "changes_requested");
    const live = myPkgs.filter((p) => p.is_published && p.review_status === "approved");
    const d = ((diagnosis ?? []) as any[])[0] ?? null;
    const activeJobs = ((jobs ?? []) as any[]).filter((j) => j.status !== "failed");
    const failedJobs = ((jobs ?? []) as any[]).filter((j) => j.status === "failed");

    // Ranked, account-specific next actions. Order = value, not category.
    const next: { priority: number; action: string; tool: string; why: string }[] = [];
    if (failedJobs.length)
      next.push({
        priority: 1,
        action: `Re-upload ${failedJobs.length} failed file(s): ${failedJobs.map((j) => j.filename).join(", ")}`,
        tool: "upload_packages",
        why: "These never reached the registry, so nothing is being scored for them.",
      });
    if (activeJobs.length)
      next.push({
        priority: 2,
        action: `Poll ${activeJobs.length} upload job(s) still running`,
        tool: "upload_status",
        why: "The queue drains roughly once a minute — report real status instead of guessing.",
      });
    if (changesRequested.length)
      next.push({
        priority: 2,
        action: `Fix and resubmit: ${changesRequested.map((p) => p.slug).join(", ")}`,
        tool: "review_skill",
        why: "A reviewer asked for changes; re-score locally before resubmitting.",
      });
    const stalled = inProgress.filter((i) => i.latest_score < 85);
    if (stalled.length)
      next.push({
        priority: 3,
        action: `Push ${stalled[0]!.doc_key} from ${stalled[0]!.latest_score} toward grade A`,
        tool: "review_skill",
        why: "Anything under 85 still has concrete top_actions left on the table.",
      });
    if (d && d.status === "scored" && Array.isArray(d.prescription) && d.prescription.length)
      next.push({
        priority: 3,
        action: `Continue the curriculum from your last ${d.domain} diagnosis (bottleneck: ${d.bottleneck ?? "n/a"})`,
        tool: "curriculum_next",
        why: "A prescription already exists — installing by name instead is guessing.",
      });
    if (!d)
      next.push({
        priority: 4,
        action: "Measure this agent once with a domain diagnosis",
        tool: "diagnose_start",
        why: "Everything else (curriculum, marginal gain, budget) is derived from a diagnosis.",
      });
    if (drafts.length && !pendingReview.length)
      next.push({
        priority: 4,
        action: `Submit ${drafts.length} private draft(s) for review to get them listed`,
        tool: "upload_packages",
        why: `Drafts stay private until submitted at ${ORIGIN}/account/packages.`,
      });
    if (live.length)
      next.push({
        priority: 5,
        action: `Check trust + install trend on your ${live.length} live package(s)`,
        tool: "get_skill_trust",
        why: "Trust score drives ranking; regressions are invisible unless you look.",
      });
    if (!sub)
      next.push({
        priority: 6,
        action: "Unlock the Agent Store and the cloud skill library",
        tool: "list_agents",
        why: `Agent Pass required — ${ORIGIN}/pricing.`,
      });
    next.push({
      priority: 7,
      action: "See what changed on the platform since your last session",
      tool: "whats_new",
      why: "New/updated registry packages and platform changes.",
    });

    return json({
      platform_version: PLATFORM_VERSION,
      window_days: lookback_days,
      tier: sub ? "paid" : "trial",
      packages: {
        live: live.map((p) => ({ slug: p.slug, name: p.name, type: p.type, installs: p.install_count, stars: p.star_count })),
        drafts: drafts.map((p) => ({ slug: p.slug, name: p.name, review_status: p.review_status })),
        pending_review: pendingReview.map((p) => p.slug),
        changes_requested: changesRequested.map((p) => p.slug),
      },
      upload_jobs: { active: activeJobs, failed: failedJobs },
      cloud_skills: cloud ?? [],
      agents_built: builds ?? [],
      last_diagnosis: d
        ? {
            diagnosis_id: d.id,
            domain: d.domain,
            status: d.status,
            overall_score: d.overall_score,
            bottleneck: d.bottleneck,
            prescription: d.prescription,
            created_at: d.created_at,
          }
        : null,
      reviews_in_progress: inProgress,
      next_actions: next.sort((a, b) => a.priority - b.priority),
      // Value proof for the human paying the bill: realized ROI so far plus the
      // money still on the table. Same numbers as the dashboard and the emails.
      value_summary: await (async () => {
        try {
          const { computeRoi } = await import("@/lib/crm/snapshot.server");
          const roi = await computeRoi(userId);
          if (!roi.reviewed_docs) return null;
          return {
            documents_reviewed: roi.reviewed_docs,
            documents_improved: roi.improved_docs,
            trust_score_points_gained: roi.points_gained,
            monthly_usd_saved: roi.monthly_usd_saved,
            annual_usd_saved: roi.annual_usd_saved,
            rescued_runs_per_month: roi.rescued_runs_per_month,
            engineer_hours_saved_per_month: roi.engineer_hours_saved_per_month,
            headroom_monthly_usd: roi.headroom_monthly_usd,
            best_improvement: roi.best,
            show_to_human:
              roi.improved_docs > 0
                ? `SAK impact so far: ${roi.improved_docs} document(s) improved, +${roi.points_gained} Trust Score points, ~$${roi.monthly_usd_saved.toLocaleString("en-US")}/month of avoidable spend removed at 10,000 runs/month. About $${roi.headroom_monthly_usd.toLocaleString("en-US")}/month is still on the table.`
                : `No measured improvement yet — ${roi.reviewed_docs} document(s) reviewed. About $${roi.headroom_monthly_usd.toLocaleString("en-US")}/month is on the table if they reach grade A.`,
            disclaimer:
              "Projected from the public SAK benchmark using this account's real scores at 10,000 runs/month.",
          };
        } catch {
          return null;
        }
      })(),
      dashboard: `${ORIGIN}/home`,
    });
  },
});

export const whatsNewTool = defineTool({
  name: "whats_new",
  description:
    "[RETURNING SESSION] What changed since a given moment: newly published and newly updated registry packages, fastest-growing installs, the current platform version, and — when a bearer is present — account changes (drafts approved or rejected, uploads finished). Use it at the start of a session, or when the user asks 'anything new?'. Read-only.",
  parameters: z.object({
    since: z.string().optional().describe("ISO timestamp of the user's last session. Defaults to 7 days ago."),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    limit: z.number().int().min(1).max(30).default(10),
  }),
  execute: async ({ since, type, limit }, ctx) => {
    const sinceIso = (() => {
      const t = since ? Date.parse(since) : NaN;
      return Number.isFinite(t) ? new Date(t).toISOString() : new Date(Date.now() - 7 * 86400_000).toISOString();
    })();

    let newQ = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,install_count,star_count,created_at,updated_at")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    let updQ = supabaseAdmin
      .from("packages")
      .select("slug,name,type,latest_version,install_count,updated_at,created_at")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .gt("updated_at", sinceIso)
      .lte("created_at", sinceIso)
      .order("updated_at", { ascending: false })
      .limit(limit);
    let topQ = supabaseAdmin
      .from("packages")
      .select("slug,name,type,install_count,star_count")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .limit(limit);
    if (type) {
      newQ = newQ.eq("type", type);
      updQ = updQ.eq("type", type);
      topQ = topQ.eq("type", type);
    }
    const [{ data: fresh }, { data: updated }, { data: top }] = await Promise.all([newQ, updQ, topQ]);

    const userId = userIdOf(ctx);
    let account: unknown = null;
    if (userId) {
      try {
        const [{ data: mine }, { data: jobs }] = await Promise.all([
          supabaseAdmin
            .from("packages")
            .select("slug,review_status,is_published,updated_at")
            .eq("author_id", userId)
            .gt("updated_at", sinceIso)
            .order("updated_at", { ascending: false })
            .limit(20),
          supabaseAdmin
            .from("package_upload_jobs")
            .select("id,filename,status,updated_at")
            .eq("user_id", userId)
            .gt("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        account = { my_packages_changed: mine ?? [], upload_jobs: jobs ?? [] };
      } catch {
        account = null;
      }
    }

    return json({
      since: sinceIso,
      platform: { version: PLATFORM_VERSION, codename: PLATFORM_CODENAME, changelog: `${ORIGIN}/status` },
      new_packages: fresh ?? [],
      updated_packages: updated ?? [],
      most_installed: top ?? [],
      account,
      next_step:
        (fresh ?? []).length || (updated ?? []).length
          ? "Use `get_package { slug }` for a manifest, or `check_updates` to see whether what the user already installed is outdated."
          : "Nothing new in that window. `check_updates` still tells you if local copies drifted behind.",
      not_connected_hint: userId ? undefined : "Pass a bearer (see `whoami`) to also get changes on your own packages and uploads.",
    });
  },
});

export const checkUpdatesTool = defineTool({
  name: "check_updates",
  description:
    "[RETURNING SESSION] Drift check for packages the user already installed locally. Send the slugs (with the version you have, if known) and get back which ones have a newer version in the registry, the current install/star counts, and the exact `get_package` calls to refresh them. Also flags slugs that no longer exist or were unpublished. Read-only, no auth.",
  parameters: z.object({
    installed: z
      .array(
        z.union([
          z.string(),
          z.object({ slug: z.string(), version: z.string().optional() }),
        ]),
      )
      .min(1)
      .max(100)
      .describe("Slugs found in the user's .agents/ or .claude/skills/ folder, optionally with the local version."),
  }),
  execute: async ({ installed }) => {
    const wanted = installed.map((i) => (typeof i === "string" ? { slug: i, version: undefined } : i));
    const slugs = [...new Set(wanted.map((w) => w.slug.trim().toLowerCase()).filter(Boolean))];
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("slug,name,type,latest_version,install_count,star_count,is_published,review_status,updated_at")
      .in("slug", slugs);
    if (error) return json({ error: error.message });
    const bySlug = new Map<string, any>((data ?? []).map((p: any) => [p.slug, p]));

    const outdated: unknown[] = [];
    const current: unknown[] = [];
    const unknown: string[] = [];
    const unpublished: unknown[] = [];

    for (const w of wanted) {
      const slug = w.slug.trim().toLowerCase();
      const p = bySlug.get(slug);
      if (!p) {
        unknown.push(w.slug);
        continue;
      }
      const entry = {
        slug: p.slug,
        name: p.name,
        type: p.type,
        local_version: w.version ?? null,
        registry_version: p.latest_version,
        installs: p.install_count,
        stars: p.star_count,
        updated_at: p.updated_at,
        refresh_with: `get_package { slug: "${p.slug}" }`,
      };
      if (!p.is_published || p.review_status !== "approved") {
        unpublished.push({ ...entry, note: "No longer listed publicly — keep the local copy, it will not receive updates." });
        continue;
      }
      if (!w.version || w.version !== p.latest_version) outdated.push(entry);
      else current.push(entry);
    }

    return json({
      checked: wanted.length,
      outdated,
      up_to_date: current,
      unpublished,
      unknown_slugs: unknown,
      next_step: outdated.length
        ? `Fetch the newest manifest for ${outdated.length} package(s) with get_package and rewrite the local file(s). Then run review_skill on the merged result to confirm the grade held.`
        : "Everything the user has is current. Try `whats_new` or `recommend_packages` for the next capability.",
    });
  },
});
