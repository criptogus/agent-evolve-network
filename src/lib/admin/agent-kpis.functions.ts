import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";

/**
 * Agent-first KPIs.
 *
 * Deliberately excludes pageviews and human sessions: if the product is
 * agent-first, the only honest measures are what agents did — tool calls,
 * installs, executions, onboarding completion, diagnoses.
 */

export type AgentKpis = {
  days: number;
  totals: {
    tool_calls: number;
    write_calls: number;
    distinct_identities: number;
    installs: number;
    executions: number;
    executions_ok: number;
    tasks_completed: number;
    diagnoses: number;
    agents_built: number;
    onboarding_sessions: number;
    onboarding_completed: number;
  };
  top_tools: Array<{ tool_name: string; calls: number; identities: number }>;
  onboarding_funnel: Array<{ step_id: string; stage: string; sessions: number; completions: number }>;
  daily: Array<{ day: string; tool_calls: number; executions: number }>;
};

const STEP_ORDER = ["connect", "discover", "inspect", "evaluate", "evolve", "diagnose"] as const;

export const getAgentKpis = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<AgentKpis> => {
    const supabase = (context as { supabase: any }).supabase;
    const days = data.days;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const [calls, installs, execs, diagnoses, builds, onboarding, funnel] = await Promise.all([
      supabase.from("mcp_call_log").select("tool_name,is_write,identity,created_at").gte("created_at", since).limit(50_000),
      supabase.from("package_installs").select("package_id,installed_at").gte("installed_at", since).limit(50_000),
      supabase
        .from("skill_executions")
        .select("success,task_completed,created_at")
        .gte("created_at", since)
        .limit(50_000),
      supabase.from("agent_diagnoses").select("id").gte("created_at", since).limit(50_000),
      supabase.from("agent_builds").select("id").gte("created_at", since).limit(50_000),
      supabase.from("agent_onboarding_steps").select("session_hash,step_id").gte("created_at", since).limit(50_000),
      supabase.rpc("agent_onboarding_funnel", { _days: days }),
    ]);

    const callRows: Array<{ tool_name: string; is_write: boolean; identity: string | null; created_at: string }> =
      calls.data ?? [];
    const execRows: Array<{ success: boolean | null; task_completed: boolean | null; created_at: string }> =
      execs.data ?? [];
    const onboardRows: Array<{ session_hash: string; step_id: string }> = onboarding.data ?? [];

    // Tool leaderboard
    const byTool = new Map<string, { calls: number; identities: Set<string> }>();
    for (const r of callRows) {
      const entry = byTool.get(r.tool_name) ?? { calls: 0, identities: new Set<string>() };
      entry.calls += 1;
      if (r.identity) entry.identities.add(r.identity);
      byTool.set(r.tool_name, entry);
    }
    const top_tools = [...byTool.entries()]
      .map(([tool_name, v]) => ({ tool_name, calls: v.calls, identities: v.identities.size }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 20);

    // Onboarding completion
    const bySession = new Map<string, Set<string>>();
    for (const r of onboardRows) {
      const set = bySession.get(r.session_hash) ?? new Set<string>();
      set.add(r.step_id);
      bySession.set(r.session_hash, set);
    }
    const onboarding_completed = [...bySession.values()].filter(
      (steps) => STEP_ORDER.every((s) => steps.has(s)),
    ).length;

    const funnelRows: Array<{ step_id: string; stage: string; completions: number; sessions: number }> =
      funnel.data ?? [];
    const onboarding_funnel = STEP_ORDER.map((id) => {
      const row = funnelRows.find((r) => r.step_id === id);
      return {
        step_id: id,
        stage: row?.stage ?? (id === "evaluate" || id === "evolve" || id === "diagnose" ? "evolve" : "connect"),
        sessions: Number(row?.sessions ?? 0),
        completions: Number(row?.completions ?? 0),
      };
    });

    // Daily series
    const dayKey = (iso: string) => iso.slice(0, 10);
    const dailyMap = new Map<string, { tool_calls: number; executions: number }>();
    for (const r of callRows) {
      const k = dayKey(r.created_at);
      const e = dailyMap.get(k) ?? { tool_calls: 0, executions: 0 };
      e.tool_calls += 1;
      dailyMap.set(k, e);
    }
    for (const r of execRows) {
      const k = dayKey(r.created_at);
      const e = dailyMap.get(k) ?? { tool_calls: 0, executions: 0 };
      e.executions += 1;
      dailyMap.set(k, e);
    }
    const daily = [...dailyMap.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return {
      days,
      totals: {
        tool_calls: callRows.length,
        write_calls: callRows.filter((r) => r.is_write).length,
        distinct_identities: new Set(callRows.map((r) => r.identity).filter(Boolean)).size,
        installs: installs.data?.length ?? 0,
        executions: execRows.length,
        executions_ok: execRows.filter((r) => r.success === true).length,
        tasks_completed: execRows.filter((r) => r.task_completed === true).length,
        diagnoses: diagnoses.data?.length ?? 0,
        agents_built: builds.data?.length ?? 0,
        onboarding_sessions: bySession.size,
        onboarding_completed,
      },
      top_tools,
      onboarding_funnel,
      daily,
    };
  });
