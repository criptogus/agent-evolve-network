import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSoul, type SoulDetail } from "@/lib/souls/get.functions";

export const Route = createFileRoute("/souls/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Soul · Super Agent Skill` },
      {
        name: "description",
        content: `Soul ${params.slug} — system prompt, rules, examples and version history. Download or duplicate to your workspace.`,
      },
    ],
  }),
  component: SoulPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Soul not found</h1>
        <p className="mt-2 text-muted-foreground">
          This soul does not exist or hasn't been published.
        </p>
        <Link to="/marketplace" className="mt-6 inline-block text-primary hover:underline">
          ← Back to marketplace
        </Link>
      </div>
      <Footer />
    </div>
  ),
});

function SoulPage() {
  const { slug } = Route.useParams();
  const fetchFn = useServerFn(getSoul);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["soul", slug],
    queryFn: () => fetchFn({ data: { slug } }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-5xl animate-pulse px-6 py-16">
          <div className="h-10 w-2/3 rounded bg-muted/40" />
          <div className="mt-4 h-4 w-1/2 rounded bg-muted/30" />
          <div className="mt-10 h-64 rounded bg-muted/20" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-destructive">
          Failed to load this soul.
        </div>
      </div>
    );
  }
  if (!data) {
    throw notFound();
  }
  return <SoulView soul={data} onDuplicate={() => navigate({ to: "/admin/packages/new" })} />;
}

function SoulView({ soul, onDuplicate }: { soul: SoulDetail; onDuplicate: () => void }) {
  const current = soul.current;

  const soulMd = buildSoulMarkdown(soul);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };
  const download = (filename: string, content: string, mime = "text/markdown") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Header */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground">
              Marketplace
            </Link>
            <span>/</span>
            <span className="font-mono">souls</span>
            <span>/</span>
            <span className="font-mono text-foreground">{soul.slug}</span>
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge className="border-violet-500/30 bg-violet-500/10 font-mono text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  soul
                </Badge>
                {current && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    v{current.version} · {current.status}
                  </Badge>
                )}
                {soul.author_verified && (
                  <Badge variant="outline" className="text-[10px]">
                    ✓ verified
                  </Badge>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{soul.name}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">{soul.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {soul.author_handle} · {soul.install_count.toLocaleString()} installs · {soul.license}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => download(`${soul.slug}.SOUL.md`, soulMd)}
                aria-label="Download SOUL.md"
              >
                ↓ Download SOUL.md
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    `${soul.slug}.json`,
                    JSON.stringify(
                      {
                        slug: soul.slug,
                        name: soul.name,
                        type: "soul",
                        version: current?.version ?? soul.latest_version,
                        system_prompt: current?.system_prompt ?? "",
                        rules: current?.rules ?? {},
                        examples: current?.examples ?? [],
                      },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                ↓ JSON
              </Button>
              <Button onClick={onDuplicate}>⧉ Duplicate</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        {!current ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No published version yet for this soul.
          </Card>
        ) : (
          <Tabs defaultValue="prompt">
            <TabsList>
              <TabsTrigger value="prompt">System prompt</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="examples">
                Examples
                {Array.isArray(current.examples) && current.examples.length > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">{current.examples.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="versions">
                Versions
                <span className="ml-1 text-[10px] opacity-70">{soul.versions.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="mt-4">
              <CodeCard
                title="system_prompt"
                content={current.system_prompt}
                onCopy={() => copy(current.system_prompt, "System prompt")}
              />
            </TabsContent>

            <TabsContent value="rules" className="mt-4">
              <CodeCard
                title="rules.json"
                content={JSON.stringify(current.rules, null, 2)}
                onCopy={() =>
                  copy(JSON.stringify(current.rules, null, 2), "Rules")
                }
                language="json"
              />
            </TabsContent>

            <TabsContent value="examples" className="mt-4 space-y-4">
              {Array.isArray(current.examples) && current.examples.length > 0 ? (
                current.examples.map((ex, i) => (
                  <Card key={i} className="p-5">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Example {i + 1}
                      {typeof (ex as any).title === "string" && (
                        <span className="ml-2 text-foreground">— {(ex as any).title}</span>
                      )}
                    </div>
                    {typeof (ex as any).input === "string" && (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Input
                        </div>
                        <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                          {(ex as any).input}
                        </pre>
                      </div>
                    )}
                    {typeof (ex as any).expected_output === "string" && (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Expected output
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs">
                          {(ex as any).expected_output}
                        </pre>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-sm text-muted-foreground">
                  No examples provided for this version.
                </Card>
              )}
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              <Card className="divide-y divide-border">
                {soul.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-4 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono">v{v.version}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {v.status}
                      </Badge>
                      {v.version === soul.latest_version && (
                        <Badge className="bg-primary/10 text-[10px] text-primary">current</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {soul.long_description && (
          <Card className="mt-10 p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              About
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {soul.long_description}
            </p>
          </Card>
        )}
      </section>
      <Footer />
    </div>
  );
}

function CodeCard({
  title,
  content,
  onCopy,
  language,
}: {
  title: string;
  content: string;
  onCopy: () => void;
  language?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {title}
          {language && <span className="ml-2 opacity-60">{language}</span>}
        </span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          Copy
        </Button>
      </div>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed">
        {content}
      </pre>
    </Card>
  );
}

function buildSoulMarkdown(soul: SoulDetail): string {
  const c = soul.current;
  const rules = c?.rules ?? {};
  const sections: string[] = [
    `# ${soul.name}`,
    "",
    `> ${soul.description}`,
    "",
    `- **Slug:** \`${soul.slug}\``,
    `- **Type:** soul`,
    `- **Version:** ${c?.version ?? soul.latest_version} (${c?.status ?? "n/a"})`,
    `- **Author:** ${soul.author_handle}`,
    `- **License:** ${soul.license}`,
    "",
    "## System prompt",
    "",
    "```text",
    c?.system_prompt ?? "(empty)",
    "```",
    "",
    "## Rules",
    "",
    "```json",
    JSON.stringify(rules, null, 2),
    "```",
  ];
  if (Array.isArray(c?.examples) && c!.examples.length) {
    sections.push("", "## Examples", "");
    c!.examples.forEach((ex: any, i: number) => {
      sections.push(`### Example ${i + 1}${ex.title ? ` — ${ex.title}` : ""}`);
      if (ex.input) sections.push("", "**Input:**", "", "```", String(ex.input), "```");
      if (ex.expected_output)
        sections.push("", "**Expected output:**", "", "```", String(ex.expected_output), "```");
      sections.push("");
    });
  }
  return sections.join("\n");
}
