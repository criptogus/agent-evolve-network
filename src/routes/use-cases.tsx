import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { USE_CASES } from "@/lib/seo/use-cases";

export const Route = createFileRoute("/use-cases")({
  head: () => ({
    meta: [
      { title: "Use cases — Super Agent Skill" },
      { name: "description", content: "Curated AI agent use cases by vertical: security PR review, fintech compliance, HIPAA-safe summaries, incident response, and more." },
    ],
  }),
  component: UseCasesIndex,
});

function UseCasesIndex() {
  const byVertical: Record<string, typeof USE_CASES> = {};
  for (const u of USE_CASES) (byVertical[u.vertical] ||= []).push(u);

  return (
    <SitePage>
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-2">Use cases</h1>
      <p className="text-muted-foreground mb-8">
        Pick a use case to see the top-ranked skills for it, plus recommended Souls and integrations.
      </p>
      {Object.entries(byVertical).map(([v, list]) => (
        <section key={v} className="mb-8">
          <h2 className="text-xl font-semibold capitalize mb-3">{v}</h2>
          <ul className="space-y-2">
            {list.map((u) => (
              <li key={u.task} className="border-b py-2">
                <a className="font-medium underline" href={`/use-case/${u.vertical}/${u.task}`}>{u.title}</a>
                <p className="text-sm text-muted-foreground">{u.intent}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
    </SitePage>
  );
}
