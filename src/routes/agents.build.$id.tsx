import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { getAgentBuild, runAgentBuildStep, getAgentBuildPrompt, BUILD_STEPS } from "@/lib/agents/factory.functions";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/agents/build/$id")({
  component: BuildPage,
  head: () => ({
    meta: [
      { title: "Your agent is being built — Agent Factory | SuperAgentSkill" },
      {
        name: "description",
        content: "Live build of your custom corporate agent: soul, skills, playbooks, guardrails and quality score.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ORDER = ["queued", "researching", "soul", "skills", "playbooks", "guardrails", "scoring", "ready"];

function BuildPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getAgentBuild);
  const runFn = useServerFn(runAgentBuildStep);
  const promptFn = useServerFn(getAgentBuildPrompt);
  const qc = useQueryClient();
  const running = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: build } = useQuery({
    queryKey: ["agent-build", id],
    queryFn: () => getFn({ data: { build_id: id } }),
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s === "ready" || s === "error" ? false : 3000;
    },
  });

  const status = (build as any)?.status as string | undefined;

  // Drive the state machine: one bounded step per request, looping until done.
  useEffect(() => {
    if (!status || status === "ready" || status === "error" || running.current) return;
    running.current = true;
    (async () => {
      try {
        for (let i = 0; i < 12; i++) {
          const res: any = await runFn({ data: { build_id: id } });
          await qc.invalidateQueries({ queryKey: ["agent-build", id] });
          if (res?.done) break;
        }
      } catch (e: any) {
        toast.error(typeof e?.message === "string" ? e.message : "The build failed.");
        await qc.invalidateQueries({ queryKey: ["agent-build", id] });
      } finally {
        running.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === undefined]);

  async function download(ext: "zip" | "md") {
    setBusy(ext);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const res = await fetch(`/api/agents/build/${id}/download/${ext}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(build as any)?.slug ?? "agent"}-agent.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  async function copyPrompt() {
    setBusy("prompt");
    try {
      const r = await promptFn({ data: { build_id: id } });
      await navigator.clipboard.writeText(r.system_prompt);
      toast.success("System prompt copied. Paste it as your agent's instructions.");
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Could not load the prompt.");
    } finally {
      setBusy(null);
    }
  }

  const b: any = build;
  const doneIdx = b ? ORDER.indexOf(b.status) : -1;
  const finalReport = b?.report?.final_pass ?? b?.report?.first_pass;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Link to="/account/agents" className="text-sm text-muted-foreground hover:text-foreground">
          ← My agents
        </Link>

        {!b && <p className="mt-6 text-muted-foreground">Loading…</p>}

        {b && (
          <>
            <header className="mt-4 mb-8">
              <div className="text-5xl">{b.emoji || "🤖"}</div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{b.name}</h1>
              <p className="mt-1 text-muted-foreground">{b.role}</p>
              {b.tagline && <p className="mt-3 text-lg">{b.tagline}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {b.grade && <Badge>Grade {b.grade}</Badge>}
                {b.score != null && <Badge variant="secondary">{b.score}/100</Badge>}
                <Badge variant="outline">{b.status}</Badge>
              </div>
            </header>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Build pipeline</CardTitle>
                <CardDescription>{b.step || "Starting…"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BUILD_STEPS.map((s) => {
                  const idx = ORDER.indexOf(s.status);
                  const done = doneIdx >= idx;
                  const active = doneIdx === idx - 1 && b.status !== "error";
                  return (
                    <div key={s.status} className="flex items-center gap-3 text-sm">
                      {b.status === "error" && active ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : done ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border" />
                      )}
                      <span className={done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                    </div>
                  );
                })}
                {b.status === "error" && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    {b.error || "The build failed."}{" "}
                    <Link to="/agents/new" className="underline">
                      Try again with a sharper brief
                    </Link>
                    .
                  </p>
                )}
              </CardContent>
            </Card>

            {b.status === "ready" && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Install your agent</CardTitle>
                  <CardDescription>Same delivery as the curated store — ZIP, single file, or copy/paste.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">Install via MCP</p>
                    <p className="mt-1 text-muted-foreground">With the SuperAgentSkill MCP connected, ask your agent:</p>
                    <code className="mt-2 block rounded bg-background px-3 py-2 text-xs">
                      install my agent {b.slug}
                    </code>
                  </div>
                </CardContent>
              </Card>
            )}

            {b.research_summary && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold">State of the art used</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{b.research_summary}</p>
                {Array.isArray(b.research_sources) && b.research_sources.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {b.research_sources.map((s: any, i: number) => (
                      <li key={i}>
                        <Badge variant="secondary">
                          {s.title}
                          {s.ref ? ` — ${s.ref}` : ""}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {finalReport?.axes?.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold">Quality score</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {finalReport.axes.map((a: any) => (
                    <div key={a.name} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{a.name}</span>
                        <span className="font-mono">{a.score}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>
                    </div>
                  ))}
                </div>
                {finalReport.verdict && <p className="mt-4 text-sm text-muted-foreground">{finalReport.verdict}</p>}
              </section>
            )}

            {b.soul && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold">The soul</h2>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm">
                  {b.soul}
                </pre>
              </section>
            )}

            {Array.isArray(b.skills) && b.skills.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold">Skills ({b.skills.length})</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {b.skills.map((s: any) => (
                    <Card key={s.slug}>
                      <CardHeader>
                        <CardTitle className="text-base">{s.title}</CardTitle>
                        <CardDescription>{s.summary}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {Array.isArray(b.playbooks) && b.playbooks.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold">Playbooks ({b.playbooks.length})</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {b.playbooks.map((p: any) => (
                    <Card key={p.slug}>
                      <CardHeader>
                        <CardTitle className="text-base">{p.title}</CardTitle>
                        <CardDescription>{p.summary}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {Array.isArray(b.guardrails) && b.guardrails.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">Guardrails ({b.guardrails.length})</h2>
                <ul className="mt-4 space-y-3">
                  {b.guardrails.map((g: any) => (
                    <li key={g.slug} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="mt-1 text-sm">{g.rule}</p>
                      {g.why && <p className="mt-1 text-xs text-muted-foreground">{g.why}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
