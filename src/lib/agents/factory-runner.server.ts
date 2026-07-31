import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import * as factory from "./factory.server";
import type { AgentBrief, AgentResearch, AgentScore } from "./factory.server";
import { gradeLetter } from "@/lib/skills/impact-projection";

const supabaseAdmin = _supabaseAdmin as any;

/**
 * Budget-aware Agent Factory runner.
 *
 * The web UI drives one step per request; MCP clients cannot poll cheaply, so
 * this runner advances as many steps as fit inside `budgetMs` and returns the
 * last persisted status. Every step is committed before the next starts, so a
 * budget cut-off never loses work and the build is resumable.
 */
export async function runBuildPipeline(
  buildId: string,
  opts: { budgetMs?: number } = {},
): Promise<{ status: string; step?: string | null; error?: string | null }> {
  const budgetMs = opts.budgetMs ?? 50_000;
  const started = Date.now();
  const stepBudget = 12_000; // don't start a step we almost certainly can't finish

  for (let i = 0; i < 12; i++) {
    if (Date.now() - started > budgetMs - stepBudget) break;

    const { data: row } = await supabaseAdmin.from("agent_builds").select("*").eq("id", buildId).maybeSingle();
    if (!row) return { status: "error", error: "Build not found" };
    if (row.status === "ready" || row.status === "error") {
      return { status: row.status, step: row.step, error: row.error };
    }

    const brief = row.brief as AgentBrief;
    const research: AgentResearch = {
      summary: row.research_summary ?? "",
      principles: (row.report?.principles as string[]) ?? [],
      sources: (row.research_sources as any[]) ?? [],
    };
    const patch = (p: Record<string, unknown>) => supabaseAdmin.from("agent_builds").update(p).eq("id", buildId);

    try {
      switch (row.status as string) {
        case "queued": {
          const r = await factory.researchRole(brief);
          await patch({
            status: "researching",
            step: "State of the art researched",
            research_summary: r.summary,
            research_sources: r.sources,
            report: { ...(row.report ?? {}), principles: r.principles },
          });
          break;
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
          break;
        }
        case "soul": {
          const skills = await factory.generateDocs("skill", brief, research, row.soul ?? "", 5);
          await patch({ status: "skills", step: `${skills.length} skills authored`, skills });
          break;
        }
        case "skills": {
          const playbooks = await factory.generateDocs("playbook", brief, research, row.soul ?? "", 3);
          await patch({ status: "playbooks", step: `${playbooks.length} playbooks authored`, playbooks });
          break;
        }
        case "playbooks": {
          const guardrails = await factory.generateGuardrails(brief, research);
          await patch({ status: "guardrails", step: `${guardrails.length} guardrails attached`, guardrails });
          break;
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
          break;
        }
        case "scoring": {
          const first = row.report?.first_pass as AgentScore | undefined;
          let soul = row.soul ?? "";
          let final = first ?? null;
          if (first && first.score < 90 && first.weaknesses?.length) {
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
          return { status: "ready", step: "Agent ready" };
        }
        default:
          return { status: row.status, step: row.step };
      }
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 500);
      await patch({ status: "error", error: msg });
      return { status: "error", error: msg };
    }
  }

  const { data: last } = await supabaseAdmin
    .from("agent_builds")
    .select("status, step, error")
    .eq("id", buildId)
    .maybeSingle();
  return { status: last?.status ?? "queued", step: last?.step, error: last?.error };
}
