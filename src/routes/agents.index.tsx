import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAgents } from "@/lib/agents/agents.functions";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/agents/")({
  component: AgentsIndex,
  head: () => ({
    meta: [
      { title: "Agent Store — Ready-to-use AI agents (CEO, CMO, CTO & more)" },
      {
        name: "description",
        content:
          "Download ready-to-use AI agents with a curated soul, skills and playbooks: CEO, COO, CTO, CMO, HR, Finance, Board, Google Ads, Meta Ads, Newsletter, LinkedIn and X.",
      },
      { property: "og:title", content: "Agent Store — Ready-to-use AI agents" },
      {
        property: "og:description",
        content: "13 curated agents. One soul, real skills, real playbooks. ZIP, MCP or copy/paste.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AgentsIndex() {
  const fn = useServerFn(listAgents);
  const { data, isLoading } = useQuery({ queryKey: ["agents"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-12">
        <header className="mb-10 max-w-3xl">
          <Badge variant="outline">Agent Pass</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Agent Store</h1>
          <p className="mt-3 text-muted-foreground">
            Ready-to-use agents. Each one bundles an operating <strong>soul</strong> (identity, reasoning process and
            hard rules), bounded <strong>skills</strong> and step-by-step <strong>playbooks</strong>. Install via MCP in
            one line, download the ZIP, or paste the system prompt into ChatGPT or Claude.
          </p>
        </header>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(data?.agents ?? []).map((a) => (
            <Link key={a.slug} to="/agents/$slug" params={{ slug: a.slug }} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-lg">
                <CardHeader>
                  <div className="text-4xl">{a.emoji}</div>
                  <CardTitle className="mt-2 group-hover:text-primary">{a.name}</CardTitle>
                  <CardDescription>{a.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{a.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      1 soul · {a.skill_count} skills · {a.playbook_count} playbooks
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
