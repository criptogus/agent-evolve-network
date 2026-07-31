import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAgents } from "@/lib/agents/agents.functions";
import { useTrack } from "@/lib/telemetry/use-track";

const PIPELINE = [
  {
    n: "01",
    title: "Describe the role",
    body: "One brief: the role, your company, the outcomes it owns and your hard constraints.",
  },
  {
    n: "02",
    title: "We research the state of the art",
    body: "The factory pulls the frameworks real operators use for that role — not generic prompt filler.",
  },
  {
    n: "03",
    title: "Soul, skills, playbooks, guardrails",
    body: "An operating identity, 5 bounded skills, 3 step-by-step playbooks and enforceable guardrails.",
  },
  {
    n: "04",
    title: "Scored and repaired to grade A",
    body: "The agent is audited on specificity, decision quality and safety, then rewritten until it clears the bar.",
  },
];

/**
 * Corporate Agent Factory — the positioning section. Curated catalog on the
 * left (instant value, no signup), the build-your-own pipeline on the right
 * (the Pro upgrade path).
 */
export function AgentFactory() {
  const track = useTrack();
  const fn = useServerFn(listAgents);
  const { data } = useQuery({ queryKey: ["agents"], queryFn: () => fn() });
  const agents = (data?.agents ?? []).slice(0, 12);

  return (
    <section className="border-b border-border bg-surface/40 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Corporate Agent Factory</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            A whole org chart of agents — installed, not prompted.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
            Download a curated executive or specialist agent, or describe a role you cannot hire fast enough and the
            factory builds it for you — always anchored on the current state of the art, always scored before delivery.
          </p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          {/* Curated catalog */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ready to install today
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {agents.map((a) => (
                <Link
                  key={a.slug}
                  to="/agents/$slug"
                  params={{ slug: a.slug }}
                  onClick={() => track("cta_clicked", { cta: "home_agent_card", slug: a.slug })}
                  className="group rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <div className="text-2xl">{a.emoji}</div>
                  <p className="mt-2 truncate text-sm font-medium group-hover:text-primary">{a.name}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                    1 soul · {a.skill_count} skills · {a.playbook_count} playbooks
                  </p>
                </Link>
              ))}
            </div>
            <Link
              to="/agents"
              onClick={() => track("cta_clicked", { cta: "home_agents_all", to: "/agents" })}
              className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Browse the full Agent Store →
            </Link>
          </div>

          {/* Build your own */}
          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm lg:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Or build your own — from a prompt
            </h3>
            <ol className="mt-5 space-y-5">
              {PIPELINE.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="font-mono text-xs font-semibold text-primary">{s.n}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/agents/new"
                onClick={() => track("cta_clicked", { cta: "home_factory_primary", to: "/agents/new" })}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] hover:opacity-95 sm:w-auto"
              >
                Build my agent →
              </Link>
              <Link
                to="/pricing"
                onClick={() => track("cta_clicked", { cta: "home_factory_pricing", to: "/pricing" })}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
              >
                See Agent Pass
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Custom agents are included in Agent Pass. Download as ZIP, single markdown file, or install straight into
              your agent over MCP.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
