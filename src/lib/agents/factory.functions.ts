import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgentBrief, AgentResearch, AgentScore } from "./factory.server";

/**
 * Agent Factory server functions (Pro-only).
 *
 * The build runs as a state machine: each `runAgentBuildStep` call performs ONE
 * bounded model step and persists it, so no single request can hit the Worker
 * timeout and a slow model never loses completed work. The UI loops until the
 * row reports `ready` or `error`.
 */

const BriefInput = z.object({
  role: z.string().min(3).max(120),
  company: z.string().min(10).max(2000),
  industry: z.string().max(120).optional(),
  outcomes: z.string().max(1500).optional(),
  tone: z.string().max(300).optional(),
  constraints: z.string().max(1500).optional(),
  context: z.string().max(8000).optional(),
  language: z.string().max(40).optional(),
});

export type AgentBuildStatus =
  | "queued"
  | "researching"
  | "soul"
  | "skills"
  | "playbooks"
  | "guardrails"
  | "scoring"
  | "ready"
  | "error";

/** Ordered pipeline — also drives the progress UI. */
export const BUILD_STEPS: { status: AgentBuildStatus; label: string }[] = [
  { status: "researching", label: "Researching the state of the art for this role" },
  { status: "soul", label: "Writing the operating soul" },
  { status: "skills", label: "Authoring skills" },
  { status: "playbooks", label: "Authoring playbooks" },
  { status: "guardrails", label: "Attaching guardrails" },
  { status: "scoring", label: "Scoring and repairing to grade A" },
];

async function assertPaid(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) {
    throw new Response("The Agent Factory requires Agent Pass or Enterprise. Upgrade at /pricing.", { status: 402 });
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "agent"
  );
}

export const startAgentBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BriefInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);

    const base = slugify(data.role);
    let slug = base;
    for (let i = 2; i < 40; i++) {
      const { data: clash } = await supabase
        .from("agent_builds")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }

    const { data: row, error } = await supabase
      .from("agent_builds")
      .insert({
        user_id: userId,
        slug,
        name: data.role,
        role: data.role,
        brief: data,
        status: "queued",
        step: "Queued",
      })
      .select("id, slug")
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any)
        .from("mcp_funnel_events")
        .insert({ event: "agent_build_started", user_id: userId, props: { slug } });
    } catch {
      /* best-effort */
    }

    return { build_id: row.id as string, slug: row.slug as string };
  });

const IdInput = z.object({ build_id: z.string().uuid() });

export const runAgentBuildStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);

    const { data: row, error } = await supabase
      .from("agent_builds")
      .select("*")
      .eq("id", data.build_id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Response("Build not found", { status: 404 });
    if (row.status === "ready" || row.status === "error") {
      return { status: row.status as AgentBuildStatus, done: true };
    }

    const factory = await import("./factory.server");
    const { gradeLetter } = await import("@/lib/skills/impact-projection");
    const brief = row.brief as AgentBrief;
    const research: AgentResearch = {
      summary: row.research_summary ?? "",
      principles: (row.report?.principles as string[]) ?? [],
      sources: (row.research_sources as any[]) ?? [],
    };

    const patch = async (p: Record<string, unknown>) => {
      const { error: uErr } = await supabase.from("agent_builds").update(p).eq("id", row.id);
      if (uErr) throw new Response(uErr.message, { status: 500 });
    };

    try {
      switch (row.status as AgentBuildStatus) {
        case "queued": {
          const r = await factory.researchRole(brief);
          await patch({
            status: "researching",
            step: "State of the art researched",
            research_summary: r.summary,
            research_sources: r.sources,
            report: { ...(row.report ?? {}), principles: r.principles },
          });
          return { status: "researching" as AgentBuildStatus, done: false };
        }
        case "researching": {
          const { identity, soul } = await factory.generateIdentityAndSoul(brief, research);
          await patch({
            status: "soul",
            step: "Operating soul written",
            name: identity.name,
            role: identity.role,
            emoji: identity.emoji,
            tagline: identity.tagline,
            soul,
          });
          return { status: "soul" as AgentBuildStatus, done: false };
        }
        case "soul": {
          const skills = await factory.generateDocs("skill", brief, research, row.soul ?? "", 5);
          await patch({ status: "skills", step: `${skills.length} skills authored`, skills });
          return { status: "skills" as AgentBuildStatus, done: false };
        }
        case "skills": {
          const playbooks = await factory.generateDocs("playbook", brief, research, row.soul ?? "", 3);
          await patch({ status: "playbooks", step: `${playbooks.length} playbooks authored`, playbooks });
          return { status: "playbooks" as AgentBuildStatus, done: false };
        }
        case "playbooks": {
          const guardrails = await factory.generateGuardrails(brief, research);
          await patch({ status: "guardrails", step: `${guardrails.length} guardrails attached`, guardrails });
          return { status: "guardrails" as AgentBuildStatus, done: false };
        }
        case "guardrails": {
          const first = await factory.scoreAgent({
            brief,
            soul: row.soul ?? "",
            skills: row.skills ?? [],
            playbooks: row.playbooks ?? [],
            guardrails: row.guardrails ?? [],
          });
          await patch({
            status: "scoring",
            step: `Scored ${first.score}/100 — repairing`,
            score: first.score,
            grade: gradeLetter(first.score),
            report: { ...(row.report ?? {}), first_pass: first },
          });
          return { status: "scoring" as AgentBuildStatus, done: false };
        }
        case "scoring": {
          const first = row.report?.first_pass as AgentScore | undefined;
          let soul = row.soul ?? "";
          let final = first ?? null;
          if (first && first.score < 90 && first.weaknesses.length) {
            soul = await factory.repairSoul({ brief, soul, weaknesses: first.weaknesses });
            final = await factory.scoreAgent({
              brief,
              soul,
              skills: row.skills ?? [],
              playbooks: row.playbooks ?? [],
              guardrails: row.guardrails ?? [],
            });
          }
          const score = Math.max(final?.score ?? 0, first?.score ?? 0);
          await patch({
            status: "ready",
            step: "Agent ready",
            soul,
            score,
            grade: gradeLetter(score),
            report: { ...(row.report ?? {}), final_pass: final, repaired: soul !== (row.soul ?? "") },
          });
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await (supabaseAdmin as any)
              .from("mcp_funnel_events")
              .insert({ event: "agent_build_ready", user_id: userId, props: { slug: row.slug, score } });
          } catch {
            /* best-effort */
          }
          return { status: "ready" as AgentBuildStatus, done: true };
        }
        default:
          return { status: row.status as AgentBuildStatus, done: true };
      }
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 500);
      await supabase.from("agent_builds").update({ status: "error", error: msg }).eq("id", row.id);
      throw new Response(`Build failed: ${msg}`, { status: 500 });
    }
  });

export const getAgentBuild = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("agent_builds")
      .select("*")
      .eq("id", data.build_id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Response("Build not found", { status: 404 });
    return row;
  });

export const listMyAgentBuilds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: rows, error } = await supabase
      .from("agent_builds")
      .select("id, slug, name, role, emoji, tagline, status, step, score, grade, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Response(error.message, { status: 500 });
    return { builds: rows ?? [] };
  });

export const deleteAgentBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("agent_builds").delete().eq("id", data.build_id).eq("user_id", userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

/** Pro-only: copy/paste system prompt for a generated agent. */
export const getAgentBuildPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);
    const { data: row, error } = await supabase
      .from("agent_builds")
      .select("*")
      .eq("id", data.build_id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Response("Build not found", { status: 404 });
    if (row.status !== "ready") throw new Response("This agent is still building.", { status: 409 });
    const { buildSystemPrompt } = await import("./factory-adapt");
    return { system_prompt: buildSystemPrompt(row as any) };
  });

/**
 * Guided editor: lets the owner refine the soul, tagline and guardrail rules
 * before publishing/downloading the agent. Server-side validation mirrors the
 * generator contract so a hand-edited agent can never ship weaker guardrails
 * than a generated one (every rule needs a rule + why).
 */
const GuardrailEdit = z.object({
  slug: z.string().min(1).max(80).optional(),
  title: z.string().min(3).max(120),
  rule: z.string().min(12).max(600),
  why: z.string().max(600).default(""),
  blocked_example: z.string().max(600).optional(),
  instead: z.string().max(600).optional(),
});

const DraftEdit = z.object({
  build_id: z.string().uuid(),
  soul: z.string().min(200).max(20000),
  tagline: z.string().max(200).optional(),
  guardrails: z.array(GuardrailEdit).min(1).max(20),
  rescore: z.boolean().default(true),
});

export const updateAgentBuildDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DraftEdit.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);

    const { data: row, error } = await supabase
      .from("agent_builds")
      .select("*")
      .eq("id", data.build_id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Response("Build not found", { status: 404 });
    if (row.status !== "ready") throw new Response("Finish the build before editing it.", { status: 409 });

    const guardrails = data.guardrails.map((g, i) => ({
      ...g,
      why: g.why || "Protects the company from an unacceptable outcome.",
      slug: g.slug || `guardrail-${i + 1}`,
    }));

    const patch: Record<string, unknown> = {
      soul: data.soul,
      guardrails,
      step: "Edited by you",
      ...(data.tagline ? { tagline: data.tagline } : {}),
    };

    let score: number | null = row.score ?? null;
    let grade: string | null = row.grade ?? null;
    let report = row.report ?? {};

    if (data.rescore) {
      const factory = await import("./factory.server");
      const { gradeLetter } = await import("@/lib/skills/impact-projection");
      const scored = await factory.scoreAgent({
        brief: row.brief as AgentBrief,
        soul: data.soul,
        skills: row.skills ?? [],
        playbooks: row.playbooks ?? [],
        guardrails,
      });
      score = scored.score;
      grade = gradeLetter(scored.score);
      report = { ...report, final_pass: scored, edited_pass: scored };
      Object.assign(patch, { score, grade, report });
    }

    const { error: uErr } = await supabase.from("agent_builds").update(patch).eq("id", row.id);
    if (uErr) throw new Response(uErr.message, { status: 500 });

    return { ok: true, score, grade };
  });
