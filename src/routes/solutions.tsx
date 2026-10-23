import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SitePage } from "@/components/site/SitePage";
import { Button } from "@/components/ui/button";
import { SOLUTIONS, planSolution } from "@/lib/solutions/catalog";
import { getSolutions, downloadSolution } from "@/lib/solutions/solutions.functions";
export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions by business goal — Super Agent Skill" },
      {
        name: "description",
        content:
          "Dependency-ordered workflows, complete skill bundles and new business categories with explicit evidence and approval status.",
      },
    ],
  }),
  component: Solutions,
});
function Solutions() {
  const [selected, setSelected] = useState(SOLUTIONS[0].id);
  const [budget, setBudget] = useState(4);
  const get = useServerFn(getSolutions),
    download = useServerFn(downloadSolution);
  const q = useQuery({ queryKey: ["solutions"], queryFn: () => get() });
  const solution = SOLUTIONS.find((s) => s.id === selected)!;
  const plan = planSolution(solution, budget);
  const approved = new Map(q.data?.available.map((p) => [p.slug, p]) ?? []);
  const unavailable = plan.packages.filter((s) => !approved.has(s));
  const categories = [...new Set(q.data?.candidates.map((s) => s.category) ?? [])];
  const exportMut = useMutation({
    mutationFn: () => download({ data: { id: selected, budget } }),
    onSuccess: (r) => {
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <SitePage>
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        <header>
          <p className="font-mono text-xs uppercase text-primary">Start with the outcome</p>
          <h1 className="mt-2 text-3xl font-semibold">Solutions by business goal</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Choose a workflow, inspect its inputs and dependencies, then download the complete
            versioned packages. Nothing runs or spends model credits automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link to="/evidence" className="underline">
              Compare measured outcomes
            </Link>
            <Link to="/account/teams" className="underline">
              Share an approved team library
            </Link>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <nav aria-label="Solution goals" className="flex flex-col gap-3">
            {SOLUTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s.id);
                  setBudget(s.context_budget);
                }}
                aria-pressed={s.id === selected}
                className={`rounded-xl border p-4 text-left ${s.id === selected ? "border-primary bg-primary/5" : ""}`}
              >
                <span className="block text-xs text-muted-foreground">{s.category}</span>
                <strong className="mt-1 block">{s.title}</strong>
              </button>
            ))}
          </nav>
          <section className="rounded-2xl border p-6">
            <h2 className="text-2xl font-semibold">{solution.title}</h2>
            <p className="mt-3 text-muted-foreground">{solution.outcome}</p>
            <h3 className="mt-5 font-semibold">Bring these inputs</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {plan.inputs.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <ol className="mt-6 space-y-4">
              {plan.steps.map((s, i) => (
                <li key={s.id} className="rounded-lg border p-4">
                  <h3 className="font-semibold">
                    {i + 1}. {s.title}
                  </h3>
                  <p className="mt-1 text-sm">{s.deliverable}</p>
                  {!!s.depends_on.length && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      Requires: {s.depends_on.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <h3 className="mt-5 font-semibold">Definition of done</h3>
            <ul className="mt-2 list-disc pl-5">
              {plan.definition_of_done.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h3 className="mt-5 font-semibold">Versioned stack</h3>
            <ul className="mt-2 space-y-2">
              {plan.packages.map((slug) => (
                <li key={slug}>
                  {approved.has(slug) ? (
                    <Link
                      to="/marketplace/$packageId"
                      params={{ packageId: slug }}
                      className="underline"
                    >
                      {approved.get(slug)!.name} · {approved.get(slug)!.latest_version}
                    </Link>
                  ) : (
                    <span>{slug} · awaiting public approval</span>
                  )}
                </li>
              ))}
            </ul>
            <label className="mt-5 block">
              Maximum packages in context
              <select
                aria-label="Context budget"
                className="ml-3 rounded border bg-background p-2"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 20].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            {plan.warnings.map((w) => (
              <p key={w} role="alert" className="mt-3 text-amber-600">
                {w}
              </p>
            ))}
            {q.isPending && <p className="mt-3">Checking package approvals…</p>}
            {q.error && (
              <p role="alert" className="mt-3">
                {q.error.message}
              </p>
            )}
            <Button
              className="mt-5"
              disabled={
                !q.data || !!unavailable.length || !plan.within_budget || exportMut.isPending
              }
              onClick={() => exportMut.mutate()}
            >
              {exportMut.isPending ? "Preparing bundle…" : "Download complete solution"}
            </Button>
            {!!unavailable.length && q.data && (
              <p className="mt-3 text-sm text-muted-foreground">
                Download unlocks when every package passes its version-specific publication gate.
              </p>
            )}
          </section>
        </div>
        <section>
          <h2 className="text-2xl font-semibold">New specialized skills</h2>
          <p className="mt-3 text-muted-foreground">
            21 new workflows across six categories. Candidate source includes offline fixtures and
            deterministic helpers; input validation is not an adversarial model evaluation. Registry
            approval is shown separately.
          </p>
          {categories.map((category) => (
            <div key={category} className="mt-7">
              <h3 className="text-xl font-semibold">{category}</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {q.data?.candidates
                  .filter((s) => s.category === category)
                  .map((s) => (
                    <article key={s.slug} className="flex flex-col rounded-xl border p-4">
                      <h4 className="font-semibold">{s.name}</h4>
                      <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.description}</p>
                      <p className="mt-3 text-xs">
                        {approved.has(s.slug)
                          ? "Public registry approved"
                          : "Candidate · public evaluation pending"}
                      </p>
                      <a
                        className="mt-3 text-sm underline"
                        href={`https://github.com/criptogus/agent-evolve-network/tree/main/skills/${s.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspect source, contract and fixtures
                      </a>
                      {approved.has(s.slug) && (
                        <Link
                          className="mt-2 text-sm underline"
                          to="/marketplace/$packageId"
                          params={{ packageId: s.slug }}
                        >
                          Open registry package
                        </Link>
                      )}
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </SitePage>
  );
}
