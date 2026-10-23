import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SitePage } from "@/components/site/SitePage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTaskEvidence } from "@/lib/evidence/evidence.functions";
export const Route = createFileRoute("/evidence")({
  validateSearch: (s: Record<string, unknown>) =>
    typeof s.slug === "string" ? { slug: s.slug } : {},
  head: () => ({ meta: [{ title: "Task evidence — Super Agent Skill" }] }),
  component: Evidence,
});
function Evidence() {
  const search = Route.useSearch();
  const [slug, setSlug] = useState(search.slug ?? "");
  const [version, setVersion] = useState("");
  const [model, setModel] = useState("");
  const [experiment, setExperiment] = useState("");
  const [filter, setFilter] = useState<{
    slug: string;
    version: string;
    model: string;
    experiment: string;
  } | null>(null);
  const get = useServerFn(getTaskEvidence);
  const q = useQuery({
    queryKey: ["task-evidence", filter],
    queryFn: () => get({ data: { ...filter!, days: 30 } }),
    enabled: !!filter,
  });
  return (
    <SitePage>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        <header>
          <p className="font-mono text-xs uppercase text-primary">Measured outcomes</p>
          <h1 className="mt-2 text-3xl font-semibold">Does the skill improve the task?</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Compare reported task completion with and without a skill, grouped by exact version,
            model and experiment. Missing outcomes are excluded from completion rates. These
            observations do not constitute model certification or prove causation.
          </p>
        </header>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter({ slug, version, model, experiment });
          }}
        >
          <Input
            aria-label="Package slug"
            placeholder="Package slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            minLength={2}
          />
          <Input
            aria-label="Version filter"
            placeholder="Version (optional)"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <Input
            aria-label="Model filter"
            placeholder="Model (optional)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <Input
            aria-label="Experiment filter"
            placeholder="Experiment (optional)"
            value={experiment}
            onChange={(e) => setExperiment(e.target.value)}
          />
          <Button disabled={q.isFetching}>Compare last 30 days</Button>
        </form>
        {q.isFetching && <p>Loading measured evidence…</p>}
        {q.error && <p role="alert">{q.error.message}</p>}
        {q.data && !q.data.groups.length && (
          <section className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">No experiment evidence for this selection</h2>
            <p className="mt-2 text-muted-foreground">
              Report control and treatment executions with the same package version, model,
              experiment key and a task_completed outcome. No score or uplift is inferred from
              missing data.
            </p>
            <Link to="/docs" className="mt-3 inline-block underline">
              Execution reporting documentation
            </Link>
          </section>
        )}
        {q.data?.groups.map((g, i) => (
          <section key={i} className="rounded-xl border p-5">
            <h2 className="font-semibold">
              {g.version ?? "Unknown version"} · {g.model ?? "Unknown model"}
            </h2>
            <p className="mt-1 break-all text-sm">Experiment: {g.experiment ?? "Not supplied"}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Arm</th>
                    <th>Executions</th>
                    <th>Measured outcomes</th>
                    <th>Completed</th>
                    <th>Completion · 95% interval</th>
                    <th>Mean latency</th>
                    <th>Total tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {(["control", "treatment"] as const).map((arm) => {
                    const r = g[arm],
                      ci = g[`${arm}_interval`];
                    return (
                      <tr key={arm} className="border-t">
                        <th className="p-2">{arm}</th>
                        <td>{r?.executions ?? 0}</td>
                        <td>{r?.measured ?? 0}</td>
                        <td>{r?.completed ?? 0}</td>
                        <td>
                          {r?.measured
                            ? `${((100 * r.completed) / r.measured).toFixed(1)}%`
                            : "No outcomes"}
                          {ci && ` (${(100 * ci.low).toFixed(1)}–${(100 * ci.high).toFixed(1)}%)`}
                        </td>
                        <td>
                          {r?.avg_latency_ms == null
                            ? "Unknown"
                            : `${r.avg_latency_ms.toFixed(0)}ms`}
                        </td>
                        <td>{r?.total_tokens ?? "Unknown"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-medium">
              {g.completion_delta_pp == null
                ? "Insufficient matched evidence"
                : `${g.completion_delta_pp >= 0 ? "+" : ""}${g.completion_delta_pp.toFixed(1)} percentage points completion`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {g.reason} Small samples produce wide intervals. Token totals are not monetary cost;
              pricing and unreported usage are not inferred.
            </p>
          </section>
        ))}
      </main>
    </SitePage>
  );
}
