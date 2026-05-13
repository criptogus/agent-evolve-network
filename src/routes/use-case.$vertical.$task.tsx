import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { EmptyState } from "@/components/site/EmptyState";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findUseCase } from "@/lib/seo/use-cases";

type SkillRow = {
  slug: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  trust_score?: number | null;
  adversarial_pass_rate?: number | null;
};

export const Route = createFileRoute("/use-case/$vertical/$task")({
  loader: async ({ params }) => {
    const uc = findUseCase(params.vertical, params.task);
    if (!uc) throw new Response("not found", { status: 404 });

    const { data: pkgs } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,description,tags,type")
      .eq("type", "skill")
      .eq("is_published", true)
      .overlaps("tags", uc.required_tags)
      .limit(50);

    const ids = (pkgs ?? []).map((p: { id: string }) => p.id);
    const { data: trust } = ids.length
      ? await supabaseAdmin
          .from("package_trust_scores")
          .select("package_id,score,adversarial_pass_rate")
          .in("package_id", ids)
      : { data: [] };
    const trustMap = new Map((trust ?? []).map((t: { package_id: string; score: number; adversarial_pass_rate: number }) => [t.package_id, t]));

    const skills: SkillRow[] = (pkgs ?? [])
      .map((p: { id: string; slug: string; name: string; description: string | null; tags: string[] | null }) => {
        const t = trustMap.get(p.id);
        return {
          slug: p.slug, name: p.name, description: p.description, tags: p.tags,
          trust_score: t ? Number(t.score) : null,
          adversarial_pass_rate: t ? Number(t.adversarial_pass_rate) : null,
        };
      })
      .sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0))
      .slice(0, 10);

    return { useCase: uc, skills };
  },
  head: ({ loaderData }) => {
    const uc = loaderData?.useCase;
    return {
      meta: [
        { title: `${uc?.title ?? "Use case"} — Super Agent Skill` },
        { name: "description", content: uc?.intent ?? "" },
        { property: "og:title", content: uc?.title ?? "" },
        { property: "og:description", content: uc?.intent ?? "" },
      ],
    };
  },
  component: UseCasePage,
});

function UseCasePage() {
  const { useCase, skills } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-3xl p-6">
      <div className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
        {useCase.vertical}
      </div>
      <h1 className="text-3xl font-bold mb-2">{useCase.title}</h1>
      <p className="text-muted-foreground mb-8">{useCase.intent}</p>

      <h2 className="text-xl font-semibold mb-3">Top skills for this use case</h2>
      {skills.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No published skills for this use case — yet"
          body="Be the first to build it, or post a bounty so authors compete to ship one."
          cta={{ label: "Post a bounty", href: "/bounties/new" }}
        />
      )}
      <ol className="space-y-3">
        {skills.map((s, i) => (
          <li key={s.slug} className="border rounded p-4">
            <div className="flex justify-between items-baseline">
              <h3 className="font-semibold">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                <a href={`/packs/${s.slug}`} className="underline">{s.name}</a>
              </h3>
              <div className="text-sm">
                trust {pct(s.trust_score)} · adv {pct(s.adversarial_pass_rate)}
              </div>
            </div>
            <p className="text-sm mt-1 text-muted-foreground">{s.description}</p>
          </li>
        ))}
      </ol>

      {(useCase.recommended_souls?.length || useCase.recommended_integrations?.length) ? (
        <section className="mt-10 border-t pt-6">
          <h2 className="text-xl font-semibold mb-3">Recommended companions</h2>
          {useCase.recommended_souls?.length ? (
            <p className="text-sm mb-2">
              Souls:{" "}
              {useCase.recommended_souls.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && ", "}<a href={`/packs/${slug}`} className="underline">{slug}</a>
                </span>
              ))}
            </p>
          ) : null}
          {useCase.recommended_integrations?.length ? (
            <p className="text-sm">
              Integrations:{" "}
              {useCase.recommended_integrations.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && ", "}<a href={`/packs/${slug}`} className="underline">{slug}</a>
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10 border-t pt-6 text-sm">
        <p>
          Install any of these in one line:
          <code className="block mt-2 p-2 bg-muted rounded">npx super-agent install &lt;slug&gt;</code>
        </p>
      </section>
    </main>
    </SitePage>
  );
}

function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
}
