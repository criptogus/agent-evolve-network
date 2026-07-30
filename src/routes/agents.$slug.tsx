import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getAgentPreview, getAgentBundle } from "@/lib/agents/agents.functions";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agents/$slug")({
  component: AgentDetail,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} agent — soul, skills & playbooks | SuperAgentSkill` },
      {
        name: "description",
        content: `Download the ${params.slug} agent: a curated operating soul plus production skills and playbooks, ready for Claude, Hermes or ChatGPT.`,
      },
      { property: "og:title", content: `${params.slug} agent — SuperAgentSkill Agent Store` },
      {
        property: "og:description",
        content: "One soul, real skills, real playbooks. Install via MCP, ZIP or copy/paste.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AgentDetail() {
  const { slug } = Route.useParams();
  const previewFn = useServerFn(getAgentPreview);
  const bundleFn = useServerFn(getAgentBundle);
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agent", slug],
    queryFn: () => previewFn({ data: { slug } }),
  });

  if (!isLoading && !data) throw notFound();

  const canDownload = !!user && isActive;

  async function copyPrompt() {
    setBusy("prompt");
    try {
      const b = await bundleFn({ data: { slug } });
      await navigator.clipboard.writeText(b.system_prompt);
      toast.success("System prompt copied. Paste it as your agent's instructions.");
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Could not load the bundle.");
    } finally {
      setBusy(null);
    }
  }

  async function download(ext: "zip" | "md") {
    setBusy(ext);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const res = await fetch(`/api/agents/${slug}/download/${ext}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-agent.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-12">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data && (
          <>
            <header className="mb-10 max-w-3xl">
              <Link to="/agents" className="text-sm text-muted-foreground hover:text-foreground">
                ← Agent Store
              </Link>
              <div className="mt-4 text-5xl">{data.summary.emoji}</div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{data.summary.name}</h1>
              <p className="mt-1 text-muted-foreground">{data.summary.role}</p>
              <p className="mt-4 text-lg">{data.summary.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.summary.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </header>

            <Card className="mb-10">
              <CardHeader>
                <CardTitle>Get this agent</CardTitle>
                <CardDescription>
                  {canDownload
                    ? "Included in your plan. Choose how you want to install it."
                    : "The Agent Store is included with Agent Pass and Enterprise."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canDownload ? (
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => download("zip")} disabled={busy !== null}>
                      {busy === "zip" ? "Preparing…" : "Download ZIP"}
                    </Button>
                    <Button variant="outline" onClick={() => download("md")} disabled={busy !== null}>
                      {busy === "md" ? "Preparing…" : "Download single .md"}
                    </Button>
                    <Button variant="outline" onClick={copyPrompt} disabled={busy !== null}>
                      {busy === "prompt" ? "Loading…" : "Copy system prompt"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link to="/pricing">Upgrade to download</Link>
                    </Button>
                    {!user && (
                      <Button variant="outline" asChild>
                        <Link to="/auth">Sign in</Link>
                      </Button>
                    )}
                  </div>
                )}

                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-medium">Install via MCP</p>
                  <p className="mt-1 text-muted-foreground">
                    With the SuperAgentSkill MCP connected, just ask your agent:
                  </p>
                  <code className="mt-2 block rounded bg-background px-3 py-2 text-xs">
                    install the {data.summary.slug} agent
                  </code>
                </div>
              </CardContent>
            </Card>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold">The soul</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Identity, reasoning process and hard rules. Preview of the first lines:
              </p>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm">
                {data.soul_excerpt}
              </pre>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold">Skills ({data.skills.length})</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.skills.map((s) => (
                  <Card key={s.slug}>
                    <CardHeader>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <CardDescription>{s.summary}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">Playbooks ({data.playbooks.length})</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.playbooks.map((p) => (
                  <Card key={p.slug}>
                    <CardHeader>
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      <CardDescription>{p.summary}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
