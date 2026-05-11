import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authorPackage } from "@/lib/skills/author.functions";
import { evaluatePackage } from "@/lib/skills/evaluator.functions";
import { autoLearnPackage } from "@/lib/skills/autolearn.functions";
import { listMyPackages } from "@/lib/skills/list.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Nav } from "@/components/site/Nav";
import { ForgeProgress, AUTHOR_STAGES, EVAL_STAGES, EVOLVE_STAGES } from "@/components/forge/ForgeProgress";

export const Route = createFileRoute("/forge")({
  head: () => ({
    meta: [
      { title: "Forge — Author, Evaluate, Auto-Learn skills" },
      { name: "description", content: "Proprietary AI to author, evaluate and evolve skills, playbooks, souls and guardrails." },
    ],
  }),
  component: ForgePage,
});

function useSession() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ? { id: s.user.id, email: s.user.email ?? undefined } : null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? undefined } : null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { ready, user };
}

function AuthGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/forge` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/forge` },
    });
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "in" ? "Sign in to Forge" : "Create your account"}</CardTitle>
          <CardDescription>Required to author, evaluate and evolve packages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}
          </Button>
          <Button variant="outline" onClick={google} className="w-full">Continue with Google</Button>
          <button className="text-sm text-muted-foreground underline" onClick={() => setMode(m => m === "in" ? "up" : "in")}>
            {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function ForgePage() {
  const { ready, user } = useSession();
  if (!ready) return <div className="p-10 text-muted-foreground">Loading…</div>;
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Forge</h1>
          <p className="text-muted-foreground mt-1">
            Proprietary skills that <strong>author</strong>, <strong>evaluate</strong> and <strong>auto-evolve</strong> agent packages.
          </p>
        </header>
        {!user ? <AuthGate /> : <ForgeTabs />}
      </main>
    </div>
  );
}

function ForgeTabs() {
  const list = useServerFn(listMyPackages);
  const { data } = useQuery({ queryKey: ["forge", "list"], queryFn: () => list() });
  return (
    <Tabs defaultValue="author">
      <TabsList>
        <TabsTrigger value="author">Author</TabsTrigger>
        <TabsTrigger value="evaluate">Evaluate</TabsTrigger>
        <TabsTrigger value="evolve">Auto-Learn</TabsTrigger>
      </TabsList>
      <TabsContent value="author"><AuthorTab /></TabsContent>
      <TabsContent value="evaluate"><EvaluateTab packages={data?.all ?? []} /></TabsContent>
      <TabsContent value="evolve"><EvolveTab packages={data?.mine ?? []} allPackages={data?.all ?? []} /></TabsContent>
    </Tabs>
  );
}

function AuthorTab() {
  const author = useServerFn(authorPackage);
  const qc = useQueryClient();
  const [brief, setBrief] = useState("");
  const [type, setType] = useState<"skill" | "playbook" | "soul" | "guardrail">("skill");
  const [vertical, setVertical] = useState("");
  const [publish, setPublish] = useState(false);
  const m = useMutation({
    mutationFn: () => author({ data: { brief, type, vertical: vertical || undefined, publish } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forge", "list"] }),
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>SkillForge Author</CardTitle>
        <CardDescription>Describe the brief; the meta-agent designs a complete, executable package.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skill">skill</SelectItem>
                <SelectItem value="playbook">playbook</SelectItem>
                <SelectItem value="soul">soul</SelectItem>
                <SelectItem value="guardrail">guardrail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vertical (optional)</Label>
            <Input value={vertical} onChange={e => setVertical(e.target.value)} placeholder="cardiology, sales, devops…" />
          </div>
        </div>
        <div>
          <Label>Brief</Label>
          <Textarea rows={6} value={brief} onChange={e => setBrief(e.target.value)}
            placeholder="What should this package make an agent good at? Include domain, tools, constraints, success criteria." />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="publish" checked={publish} onCheckedChange={setPublish} />
          <Label htmlFor="publish">Publish to marketplace as stable (otherwise saved as private beta)</Label>
        </div>
        <Button disabled={m.isPending || brief.length < 20} onClick={() => m.mutate()}>
          {m.isPending ? "Authoring…" : "Author package"}
        </Button>
        <ForgeProgress
          active={m.isPending}
          done={!!m.data}
          stages={AUTHOR_STAGES}
          title="Criando o pacote (pesquisa → método SkillForge → refino até 9+/10)"
        />
        {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
        {m.data && (
          <div className="mt-4 rounded-md border p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{m.data.draft.type}</Badge>
              <strong>{m.data.draft.name}</strong>
              <span className="text-muted-foreground text-sm">@ v0.1.0</span>
              <a
                href={`/api/skills/${m.data.package.slug}/export`}
                className="ml-auto inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-background"
                download
              >
                ⬇ Download SKILL.md (Anthropic format)
              </a>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{m.data.draft.description}</p>
            <details className="mt-3"><summary className="cursor-pointer text-sm">System prompt</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">{m.data.draft.system_prompt}</pre>
            </details>
            <details className="mt-2"><summary className="cursor-pointer text-sm">Rules + examples ({m.data.draft.examples.length})</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify({ rules: m.data.draft.rules, examples: m.data.draft.examples }, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvaluateTab({ packages }: { packages: Array<{ slug: string; name: string }> }) {
  const evaluate = useServerFn(evaluatePackage);
  const [slug, setSlug] = useState("");
  const m = useMutation({ mutationFn: () => evaluate({ data: { package_slug: slug, extra_cases: [] } }) });
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>SkillForge Evaluator</CardTitle>
        <CardDescription>Runs the package on canonical + adversarial cases and judges precision, hallucination and safety.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Package</Label>
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger><SelectValue placeholder="select…" /></SelectTrigger>
            <SelectContent>
              {packages.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name} <span className="text-muted-foreground">({p.slug})</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!slug || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Evaluating…" : "Run evaluation"}
        </Button>
        <ForgeProgress
          active={m.isPending}
          done={!!m.data}
          stages={EVAL_STAGES}
          title="Avaliando o skill (multi-modelo · adversarial · safety)"
          finalScore={m.data?.evaluation.overall_score ?? null}
          verdict={m.data?.evaluation.verdict ?? null}
        />
        {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
        {m.data && (
          <div className="mt-2 rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={m.data.evaluation.verdict === "ship" ? "default" : m.data.evaluation.verdict === "iterate" ? "secondary" : "destructive"}>
                {m.data.evaluation.verdict}
              </Badge>
              <span className="text-sm">overall <strong>{m.data.evaluation.overall_score}</strong></span>
              <span className="text-xs text-muted-foreground">precision {m.data.evaluation.precision} · health {m.data.evaluation.health} · halluc {m.data.evaluation.hallucination_rate} · safety {m.data.evaluation.safety}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Strengths</p>
                <ul className="list-disc pl-5 text-muted-foreground">{m.data.evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <p className="font-medium">Weaknesses</p>
                <ul className="list-disc pl-5 text-muted-foreground">{m.data.evaluation.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>
            <div>
              <p className="font-medium text-sm">Improvement actions</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">{m.data.evaluation.improvement_actions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <details><summary className="cursor-pointer text-sm">Per-case results ({m.data.evaluation.example_results.length})</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(m.data.evaluation.example_results, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvolveTab({ packages, allPackages }: {
  packages: Array<{ slug: string; name: string }>;
  allPackages: Array<{ slug: string; name: string }>;
}) {
  const choices = packages.length ? packages : allPackages;
  const evolve = useServerFn(autoLearnPackage);
  const [slug, setSlug] = useState("");
  const [apply, setApply] = useState(false);
  const m = useMutation({ mutationFn: () => evolve({ data: { package_slug: slug, apply } }) });
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>SkillForge Auto-Learner</CardTitle>
        <CardDescription>Reads metrics + learnings and proposes the smallest patch that lifts quality. Apply to create a beta version.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Package</Label>
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger><SelectValue placeholder="select…" /></SelectTrigger>
            <SelectContent>
              {choices.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="apply" checked={apply} onCheckedChange={setApply} />
          <Label htmlFor="apply">Apply patch as new beta version</Label>
        </div>
        <Button disabled={!slug || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Analyzing…" : apply ? "Patch & publish beta" : "Propose patch"}
        </Button>
        <ForgeProgress
          active={m.isPending}
          done={!!m.data}
          stages={EVOLVE_STAGES}
          title="Aprimorando o skill até virar campeão"
        />
        {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
        {m.data && (
          <div className="mt-2 rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge>{m.data.current_version.version} → {m.data.patch.next_version}</Badge>
              <span className="text-muted-foreground">confidence {m.data.patch.confidence}%</span>
              {m.data.applied && <Badge variant="secondary">applied as beta</Badge>}
            </div>
            <p className="text-sm">{m.data.patch.rationale}</p>
            <div>
              <p className="font-medium text-sm">Changelog</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">{m.data.patch.changelog.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
            <details><summary className="cursor-pointer text-sm">Patched system prompt</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">{m.data.patch.patched_system_prompt}</pre>
            </details>
            <details><summary className="cursor-pointer text-sm">Patched rules + new examples</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify({ rules: m.data.patch.patched_rules, examples: m.data.patch.new_examples }, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
