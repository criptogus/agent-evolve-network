import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowRight, ClipboardCheck, Loader2, Search, Stethoscope } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { startDiagnosis, submitDiagnosis } from "@/lib/university/university.functions";
import { DOMAINS, type DomainId, type DomainCategory } from "@/lib/university/types";

export const Route = createFileRoute("/diagnose")({
  head: () => ({
    meta: [
      { title: "Agent admission exam — Super Agent Skill" },
      {
        name: "description",
        content:
          "Before installing a skill, measure the agent: 168 fixed tasks across 21 corporate domains, a score by error class (ambiguity, hallucination, format, abandonment, policy), and a prescription for what to install next.",
      },
      { property: "og:title", content: "Enrollment is diagnosis, not download" },
      {
        property: "og:description",
        content:
          "Admission exam for agents: find the error class that's blocking your agent and get the prescription — not a catalog.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://superagentskill.com/diagnose" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/diagnose" }],
  }),
  component: DiagnosePage,
});

type Task = { case_id: string; prompt: string; output_contract?: string };

const CATEGORY_ORDER: DomainCategory[] = ["Foundation", "Revenue", "Execution", "Operations", "Media & Product"];

function DiagnosePage() {
  const start = useServerFn(startDiagnosis);
  const submit = useServerFn(submitDiagnosis);

  const [domain, setDomain] = useState<DomainId>("gtm");
  const [installed, setInstalled] = useState("");
  const [exam, setExam] = useState<{ diagnosis_id: string | null; tasks: Task[] } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const installedList = useMemo(
    () => installed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 64),
    [installed],
  );

  const groupedDomains = useMemo(() => {
    const map = new Map<DomainCategory, typeof DOMAINS>();
    for (const d of DOMAINS) {
      if (
        query &&
        !d.name.toLowerCase().includes(query.toLowerCase()) &&
        !d.blurb.toLowerCase().includes(query.toLowerCase()) &&
        !d.id.toLowerCase().includes(query.toLowerCase())
      ) {
        continue;
      }
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return CATEGORY_ORDER.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter((g) => g.items.length > 0);
  }, [query]);

  const agentBrief = useMemo(() => {
    if (!exam) return "";
    return [
      "Execute each task below as if it were a real user request. Do not seek extra context and do not optimize for the exam.",
      "Return a single JSON: an array of { case_id, answer, latency_ms?, tokens? }.",
      "",
      ...exam.tasks.map(
        (t, i) =>
          `### ${i + 1}. ${t.case_id}\n${t.prompt}${t.output_contract ? `\nOutput contract: ${t.output_contract}` : ""}`,
      ),
    ].join("\n");
  }, [exam]);

  async function onStart() {
    setBusy(true);
    setError(null);
    setReport(null);
    setTranscript("");
    try {
      const res = await start({ data: { domain, installed_skills: installedList } });
      setExam({ diagnosis_id: res.diagnosis_id, tasks: res.tasks as Task[] });
    } catch {
      setError("Could not start the exam right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(transcript);
      } catch {
        setError("The transcript must be valid JSON: an array of { case_id, answer }.");
        setBusy(false);
        return;
      }
      const answers = Array.isArray(parsed) ? parsed : parsed?.answers;
      if (!Array.isArray(answers) || !answers.length) {
        setError("No answers found in the JSON.");
        setBusy(false);
        return;
      }
      const res = await submit({
        data: {
          diagnosis_id: exam?.diagnosis_id ?? undefined,
          domain,
          installed_skills: installedList,
          answers: answers.slice(0, 80).map((a: any) => ({
            case_id: String(a.case_id ?? ""),
            answer: String(a.answer ?? "").slice(0, 20000),
            latency_ms: Number.isFinite(a.latency_ms) ? Number(a.latency_ms) : undefined,
            tokens: Number.isFinite(a.tokens) ? Number(a.tokens) : undefined,
          })),
        },
      });
      setReport(res);
    } catch {
      setError("Failed to score the transcript. Check the case_id values sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Agent university
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Enrollment is diagnosis, not download.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Installing a skill by name is a guess. Here the agent takes an admission exam with fixed domain
          tasks and gets the transcript back: <strong>where</strong> it fails, in <strong>which error
          class</strong>, and at what cost. Only then comes the prescription.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="h-4 w-4 text-primary" /> 1. Choose the domain
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domain (e.g. sales, pricing, ads...)"
              className="pl-9"
            />
          </div>

          <div className="mt-4 space-y-5">
            {groupedDomains.map((g) => (
              <div key={g.category}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.category}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDomain(d.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        domain === d.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{d.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label className="mt-5 block text-xs font-medium text-muted-foreground">
            Capabilities already installed on the agent (optional, comma-separated) — used to calculate
            marginal gain
          </label>
          <Textarea
            value={installed}
            onChange={(e) => setInstalled(e.target.value)}
            placeholder="clarify-before-acting, code-reviewer"
            className="mt-2 min-h-[64px] font-mono text-xs"
          />

          <Button onClick={onStart} disabled={busy} className="mt-4">
            {busy && !exam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate exam
          </Button>
        </div>

        {exam && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardCheck className="h-4 w-4 text-primary" /> 2. Run the {exam.tasks.length} tasks on
              your agent
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste the block below into your agent (Claude, Hermes, ChatGPT, Cursor). It runs the tasks and returns
              the JSON with the answers. Grading expectations are private by design — part of the cases are
              holdout.
            </p>
            <div className="mt-4">
              <CodeBlock code={agentBrief} lang="markdown" filename="exam.md" />
            </div>

            <label className="mt-5 block text-xs font-medium text-muted-foreground">
              3. Paste the answers JSON here
            </label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='[{"case_id":"gtm-amb-1","answer":"..."}]'
              className="mt-2 min-h-[160px] font-mono text-xs"
            />
            <Button onClick={onSubmit} disabled={busy || !transcript.trim()} className="mt-4">
              {busy && exam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Score transcript
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </p>
        )}

        {report && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" /> Exam transcript
              </div>
              <div className="font-mono text-sm">
                {report.overall_score}/100 · <span className="text-muted-foreground">{report.grade}</span>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              {report.bottleneck}
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Error class</th>
                    <th className="py-2">Cases</th>
                    <th className="py-2">Failures</th>
                    <th className="py-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.error_profile.map((p: any) => (
                    <tr key={p.error_class} className="border-t border-border/60">
                      <td className="py-2">{p.label}</td>
                      <td className="py-2 font-mono">{p.total}</td>
                      <td className="py-2 font-mono">{p.failed}</td>
                      <td className={`py-2 font-mono ${p.fail_rate > 40 ? "text-destructive" : ""}`}>
                        {p.fail_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!!report.prescription?.length && (
              <>
                <h2 className="mt-6 text-sm font-semibold">Prescription</h2>
                <ul className="mt-2 space-y-2">
                  {report.prescription.map((p: any) => (
                    <li key={p.slug} className="rounded-xl border border-border p-3 text-sm">
                      <div className="font-medium">
                        {p.title}{" "}
                        <span className="font-mono text-xs text-muted-foreground">{p.slug}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{p.why}</div>
                      <div className="mt-1 font-mono text-xs text-primary">
                        expected gain ≈ +{p.expected_gain_pp} pp
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link
                  to="/curriculum"
                  search={
                    {
                      diagnosis_id: report.diagnosis_id ?? undefined,
                      domain: report.domain,
                    } as never
                  }
                >
                  See the track <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/connect">Run this via MCP</Link>
              </Button>
            </div>

            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                See case-by-case results
              </summary>
              <ul className="mt-3 space-y-1 text-xs">
                {report.results.map((r: any) => (
                  <li key={r.case_id} className="flex gap-2">
                    <span className={r.passed ? "text-primary" : "text-destructive"}>
                      {r.passed ? "PASS" : "FAIL"}
                    </span>
                    <span className="font-mono">{r.case_id}</span>
                    <span className="text-muted-foreground">{r.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-5">
          <h2 className="text-sm font-semibold">Via MCP or plain HTTP</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Via MCP: <code className="font-mono text-xs">diagnose_start</code> →{" "}
            <code className="font-mono text-xs">diagnose_submit</code> →{" "}
            <code className="font-mono text-xs">curriculum_next</code>. Without MCP, plain JSON:
          </p>
          <div className="mt-3">
            <CodeBlock
              code={`curl -sS https://superagentskill.com/api/public/diagnose/start \\
  -H 'Content-Type: application/json' \\
  -d '{"domain":"${domain}"}'

# run the tasks and return the transcript
curl -sS https://superagentskill.com/api/public/diagnose/submit \\
  -H 'Content-Type: application/json' \\
  -d '{"diagnosis_id":"<id>","answers":[{"case_id":"gtm-amb-1","answer":"..."}]}'`}
            />
          </div>
        </div>
      </main>
    </SitePage>
  );
}
