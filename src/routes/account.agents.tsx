import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMyAgentBuilds, deleteAgentBuild } from "@/lib/agents/factory.functions";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account/agents")({
  component: MyAgents,
  head: () => ({
    meta: [
      { title: "My agents — Agent Factory | SuperAgentSkill" },
      { name: "description", content: "Every agent you generated: grade, status and downloads." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function MyAgents() {
  const listFn = useServerFn(listMyAgentBuilds);
  const delFn = useServerFn(deleteAgentBuild);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["my-agent-builds"], queryFn: () => listFn() });
  const builds = (data as any)?.builds ?? [];

  async function remove(id: string) {
    try {
      await delFn({ data: { build_id: id } });
      await qc.invalidateQueries({ queryKey: ["my-agent-builds"] });
      toast.success("Agent deleted.");
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Could not delete.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My agents</h1>
            <p className="mt-2 text-muted-foreground">Agents you generated with the Agent Factory. Private to you.</p>
          </div>
          <Button asChild>
            <Link to="/agents/new">Build a new agent</Link>
          </Button>
        </header>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        {!isLoading && builds.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No agents yet</CardTitle>
              <CardDescription>
                Describe a role and we build the whole agent — soul, skills, playbooks and guardrails.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/agents/new">Build my first agent</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/agents">Browse ready-made agents</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {builds.map((b: any) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-3xl">{b.emoji || "🤖"}</div>
                    <CardTitle className="mt-2 text-lg">{b.name}</CardTitle>
                    <CardDescription>{b.role}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {b.grade && <Badge>Grade {b.grade}</Badge>}
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button size="sm" asChild>
                  <Link to="/agents/build/$id" params={{ id: b.id }}>
                    Open
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                  Delete
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
