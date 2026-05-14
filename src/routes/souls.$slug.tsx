import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShareOnXButton } from "@/components/share/ShareOnXButton";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSoul, type SoulDetail } from "@/lib/souls/get.functions";
import { SoulDisclaimer, SOUL_DISCLAIMER_TEXT } from "@/components/souls/SoulDisclaimer";
import {
  createSoulVersion,
  rollbackSoulVersion,
  setSoulVersionStatus,
  getSoulOwnership,
} from "@/lib/souls/manage.functions";

export const Route = createFileRoute("/souls/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Soul · Super Agent Skill` },
      {
        name: "description",
        content: `Soul ${params.slug} — system prompt, rules, examples and version history. Manage releases, publish updates, and roll back.`,
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
  const ownershipFn = useServerFn(getSoulOwnership);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["soul", slug],
    queryFn: () => fetchFn({ data: { slug } }),
    staleTime: 60_000,
  });

  const ownership = useQuery({
    queryKey: ["soul-ownership", slug],
    queryFn: () => ownershipFn({ data: { slug } }).catch(() => ({ is_owner: false, is_admin: false })),
    staleTime: 60_000,
    retry: false,
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
  return (
    <SoulView
      soul={data}
      isOwner={!!ownership.data?.is_owner}
      onDuplicate={() => navigate({ to: "/admin/packages/new" })}
    />
  );
}

function SoulView({
  soul,
  isOwner,
  onDuplicate,
}: {
  soul: SoulDetail;
  isOwner: boolean;
  onDuplicate: () => void;
}) {
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
                {isOwner && (
                  <Badge className="bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                    owner
                  </Badge>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{soul.name}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">{soul.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {soul.author_handle} · {soul.install_count.toLocaleString()} installs · {soul.license}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ShareOnXButton
                slug={soul.slug}
                type="soul"
                name={soul.name}
                description={soul.description}
                url={`/souls/${soul.slug}`}
              />
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
          <SoulDisclaimer name={soul.name} />
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
              {isOwner && <TabsTrigger value="manage">Manage</TabsTrigger>}
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
                onCopy={() => copy(JSON.stringify(current.rules, null, 2), "Rules")}
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
              <VersionsList soul={soul} isOwner={isOwner} />
            </TabsContent>

            {isOwner && (
              <TabsContent value="manage" className="mt-4">
                <ManagePanel soul={soul} />
              </TabsContent>
            )}
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

        <div className="mt-10">
          <ReviewsSection slug={soul.slug} />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function VersionsList({ soul, isOwner }: { soul: SoulDetail; isOwner: boolean }) {
  const qc = useQueryClient();
  const rollbackFn = useServerFn(rollbackSoulVersion);
  const statusFn = useServerFn(setSoulVersionStatus);
  const [pendingRollback, setPendingRollback] = useState<string | null>(null);

  const rollback = useMutation({
    mutationFn: (version: string) => rollbackFn({ data: { slug: soul.slug, version } }),
    onSuccess: (res) => {
      toast.success(`Rolled back to v${res.latest_version}`);
      qc.invalidateQueries({ queryKey: ["soul", soul.slug] });
      setPendingRollback(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Rollback failed"),
  });

  const changeStatus = useMutation({
    mutationFn: (vars: { version: string; status: string }) =>
      statusFn({ data: { slug: soul.slug, version: vars.version, status: vars.status as any } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["soul", soul.slug] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  return (
    <>
      <Card className="divide-y divide-border">
        {soul.versions.map((v) => (
          <div
            key={v.id}
            className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-foreground">v{v.version}</span>
              <Badge variant="outline" className="text-[10px]">
                {v.status}
              </Badge>
              {v.is_current && (
                <Badge className="bg-primary/10 text-[10px] text-primary">current</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()}
              </span>
              {v.notes && (
                <span className="text-xs italic text-muted-foreground">— {v.notes}</span>
              )}
            </div>
            {isOwner && (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  defaultValue={v.status}
                  onValueChange={(s) => changeStatus.mutate({ version: v.version, status: s })}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">stable</SelectItem>
                    <SelectItem value="beta">beta</SelectItem>
                    <SelectItem value="candidate">candidate</SelectItem>
                    <SelectItem value="deprecated">deprecated</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={v.is_current ? "ghost" : "outline"}
                  disabled={v.is_current || rollback.isPending}
                  onClick={() => setPendingRollback(v.version)}
                >
                  ↺ Rollback to this
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <AlertDialog
        open={!!pendingRollback}
        onOpenChange={(o) => !o && setPendingRollback(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback to v{pendingRollback}?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets <span className="font-mono">v{pendingRollback}</span> as the current
              release. Newer versions stay in history and can be reactivated at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRollback && rollback.mutate(pendingRollback)}
            >
              Confirm rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ManagePanel({ soul }: { soul: SoulDetail }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createSoulVersion);
  const current = soul.current;

  const suggested = useMemo(() => {
    const versions = soul.versions.map((v) => v.version);
    const max =
      versions
        .map((v) => v.match(/^(\d+)\.(\d+)\.(\d+)$/))
        .filter(Boolean)
        .map((m) => [+m![1], +m![2], +m![3]] as [number, number, number])
        .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] ?? [0, 0, 0];
    return `${max[0]}.${max[1]}.${max[2] + 1}`;
  }, [soul.versions]);

  const [version, setVersion] = useState(suggested);
  const [status, setStatus] = useState<"stable" | "beta" | "candidate" | "deprecated">("stable");
  const [systemPrompt, setSystemPrompt] = useState(current?.system_prompt ?? "");
  const [rulesText, setRulesText] = useState(JSON.stringify(current?.rules ?? {}, null, 2));
  const [examplesText, setExamplesText] = useState(
    JSON.stringify(current?.examples ?? [], null, 2),
  );
  const [notes, setNotes] = useState("");
  const [setCurrent, setSetCurrent] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      let rules: any;
      let examples: any;
      try {
        rules = JSON.parse(rulesText || "{}");
      } catch {
        throw new Error("Rules must be valid JSON");
      }
      try {
        examples = JSON.parse(examplesText || "[]");
        if (!Array.isArray(examples)) throw new Error("Examples must be a JSON array");
      } catch (e: any) {
        throw new Error(e?.message ?? "Examples must be a JSON array");
      }
      return createFn({
        data: {
          slug: soul.slug,
          version,
          status,
          system_prompt: systemPrompt,
          rules,
          examples,
          notes: notes || undefined,
          set_as_current: setCurrent,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Released v${res.version.version}`);
      qc.invalidateQueries({ queryKey: ["soul", soul.slug] });
      setNotes("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Release failed"),
  });

  const bump = (kind: "patch" | "minor" | "major") => {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(soul.latest_version);
    if (!m) return;
    const [a, b, c] = [+m[1], +m[2], +m[3]];
    if (kind === "major") setVersion(`${a + 1}.0.0`);
    else if (kind === "minor") setVersion(`${a}.${b + 1}.0`);
    else setVersion(`${a}.${b}.${c + 1}`);
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Release a new version</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit the prompt and rules below. Each release is stored in history and can be rolled
            back at any time.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          current v{soul.latest_version}
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Label htmlFor="version">Version (semver)</Label>
          <Input
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="mt-1 font-mono"
          />
          <div className="mt-2 flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => bump("patch")} className="h-7 text-xs">
              +patch
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bump("minor")} className="h-7 text-xs">
              +minor
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bump("major")} className="h-7 text-xs">
              +major
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger id="status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">stable</SelectItem>
              <SelectItem value="beta">beta</SelectItem>
              <SelectItem value="candidate">candidate</SelectItem>
              <SelectItem value="deprecated">deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={setCurrent}
              onChange={(e) => setSetCurrent(e.target.checked)}
              className="h-4 w-4"
            />
            Set as current release
          </label>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="prompt">System prompt</Label>
        <Textarea
          id="prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          className="mt-1 font-mono text-xs"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rules">Rules (JSON)</Label>
          <Textarea
            id="rules"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            rows={10}
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div>
          <Label htmlFor="examples">Examples (JSON array)</Label>
          <Textarea
            id="examples"
            value={examplesText}
            onChange={(e) => setExamplesText(e.target.value)}
            rows={10}
            className="mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="notes">Release notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What changed in this release?"
          className="mt-1"
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSystemPrompt(current?.system_prompt ?? "");
            setRulesText(JSON.stringify(current?.rules ?? {}, null, 2));
            setExamplesText(JSON.stringify(current?.examples ?? [], null, 2));
            setNotes("");
            setVersion(suggested);
          }}
        >
          Reset to current
        </Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending || !systemPrompt.trim()}>
          {create.isPending ? "Releasing…" : "Release version"}
        </Button>
      </div>
    </Card>
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
  if (soul.versions.length) {
    sections.push("", "## Version history", "");
    soul.versions.forEach((v) => {
      sections.push(
        `- **v${v.version}** · ${v.status}${v.is_current ? " · current" : ""} — ${new Date(v.created_at).toISOString()}${v.notes ? ` — ${v.notes}` : ""}`,
      );
    });
  }
  return sections.join("\n");
}
