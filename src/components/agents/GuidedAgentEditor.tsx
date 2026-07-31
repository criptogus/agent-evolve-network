import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Library, Plus, Trash2 } from "lucide-react";
import { updateAgentBuildDraft } from "@/lib/agents/factory.functions";
import {
  GUARDRAIL_CATEGORIES,
  guardrailsByCategory,
  type GuardrailCategory,
} from "@/lib/agents/guardrail-library";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";


type Guardrail = {
  slug?: string;
  title: string;
  rule: string;
  why?: string;
  blocked_example?: string;
  instead?: string;
};

type Props = {
  buildId: string;
  initialSoul: string;
  initialTagline?: string | null;
  initialGuardrails: Guardrail[];
  onDone?: () => void;
};

/** Sections a strong soul is expected to cover — drives the guided checklist. */
const SOUL_CHECKS: { label: string; test: (s: string) => boolean; hint: string }[] = [
  {
    label: "Identity — who this agent is",
    test: (s) => /(you are|identity|role)/i.test(s),
    hint: 'Open with "You are …" so the model adopts the role instead of describing it.',
  },
  {
    label: "Operating process — how it thinks step by step",
    test: (s) => /(process|steps?|first|then)/i.test(s) && s.split("\n").length > 8,
    hint: "Add a numbered reasoning process: what it gathers, decides, and produces.",
  },
  {
    label: "Output contract — the shape of an answer",
    test: (s) => /(output|deliverable|format|structure)/i.test(s),
    hint: "State the expected output format (sections, tables, max length).",
  },
  {
    label: "Uncertainty handling — what it does when data is missing",
    test: (s) => /(unknown|uncertain|assumption|missing|don't know|do not know)/i.test(s),
    hint: "Tell it to name assumptions and ask instead of inventing numbers.",
  },
  {
    label: "Escalation — when a human decides",
    test: (s) => /(escalat|human|approval|legal|owner)/i.test(s),
    hint: "Define which decisions must go to a human before acting.",
  },
];

function guardrailIssues(g: Guardrail): string[] {
  const out: string[] = [];
  if (g.title.trim().length < 3) out.push("Give it a short title.");
  if (g.rule.trim().length < 12) out.push("The rule must be a checkable sentence.");
  if (!g.why || g.why.trim().length < 8) out.push("Explain why it exists — reviewers ask.");
  if (!g.blocked_example) out.push("Add a request this rule blocks.");
  if (!g.instead) out.push("Say what the agent does instead.");
  return out;
}

export function GuidedAgentEditor({ buildId, initialSoul, initialTagline, initialGuardrails, onDone }: Props) {
  const saveFn = useServerFn(updateAgentBuildDraft);
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [soul, setSoul] = useState(initialSoul);
  const [tagline, setTagline] = useState(initialTagline ?? "");
  const [guardrails, setGuardrails] = useState<Guardrail[]>(
    initialGuardrails.length ? initialGuardrails.map((g) => ({ ...g })) : [{ title: "", rule: "", why: "" }],
  );
  const [rescore, setRescore] = useState(true);
  const [saving, setSaving] = useState(false);

  const soulChecks = useMemo(() => SOUL_CHECKS.map((c) => ({ ...c, ok: c.test(soul) })), [soul]);
  const soulReady = soul.trim().length >= 200;
  const guardrailsReady = guardrails.every((g) => g.title.trim().length >= 3 && g.rule.trim().length >= 12);
  const openIssues = guardrails.reduce((n, g) => n + guardrailIssues(g).length, 0);

  function update(i: number, patch: Partial<Guardrail>) {
    setGuardrails((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await saveFn({
        data: {
          build_id: buildId,
          soul,
          tagline: tagline || undefined,
          guardrails: guardrails.map((g) => ({
            slug: g.slug,
            title: g.title.trim(),
            rule: g.rule.trim(),
            why: (g.why ?? "").trim(),
            blocked_example: g.blocked_example?.trim() || undefined,
            instead: g.instead?.trim() || undefined,
          })),
          rescore,
        },
      });
      await qc.invalidateQueries({ queryKey: ["agent-build", buildId] });
      toast.success(
        res?.score != null ? `Saved. New score: ${res.score}/100 (grade ${res.grade}).` : "Changes saved.",
      );
      onDone?.();
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  const steps = ["Soul", "Guardrails", "Review & publish"];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Guided editor</CardTitle>
        <CardDescription>
          Tune the soul and the guardrail rules before you publish. Each step tells you exactly what a
          production-grade agent needs.
        </CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                i === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ge-tagline">Tagline</Label>
              <Input
                id="ge-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One line that says what this agent is for"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ge-soul">Soul (identity, process, output contract)</Label>
              <Textarea
                id="ge-soul"
                value={soul}
                onChange={(e) => setSoul(e.target.value)}
                rows={18}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{soul.trim().length} characters — minimum 200.</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Coverage checklist</p>
              <ul className="mt-3 space-y-2">
                {soulChecks.map((c) => (
                  <li key={c.label} className="flex gap-2 text-sm">
                    {c.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>
                      <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
                      {!c.ok && <span className="block text-xs text-muted-foreground">{c.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {guardrails.map((g, i) => {
              const issues = guardrailIssues(g);
              return (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Input
                      value={g.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder={`Guardrail ${i + 1} title`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove guardrail"
                      onClick={() => setGuardrails((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={guardrails.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={g.rule}
                    onChange={(e) => update(i, { rule: e.target.value })}
                    rows={2}
                    placeholder="Rule — a single checkable sentence (Never … / Always …)"
                  />
                  <Textarea
                    value={g.why ?? ""}
                    onChange={(e) => update(i, { why: e.target.value })}
                    rows={2}
                    placeholder="Why this rule exists"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Textarea
                      value={g.blocked_example ?? ""}
                      onChange={(e) => update(i, { blocked_example: e.target.value })}
                      rows={2}
                      placeholder="A request this blocks"
                    />
                    <Textarea
                      value={g.instead ?? ""}
                      onChange={(e) => update(i, { instead: e.target.value })}
                      rows={2}
                      placeholder="What the agent does instead"
                    />
                  </div>
                  {issues.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {issues.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <Button
              variant="outline"
              onClick={() => setGuardrails((prev) => [...prev, { title: "", rule: "", why: "" }])}
              disabled={guardrails.length >= 20}
            >
              <Plus className="mr-2 h-4 w-4" /> Add guardrail
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Soul</p>
                <p className="mt-1 text-sm font-medium">{soul.trim().length} chars</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Guardrails</p>
                <p className="mt-1 text-sm font-medium">{guardrails.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Open suggestions</p>
                <p className="mt-1 text-sm font-medium">{openIssues}</p>
              </div>
            </div>

            {!soulReady && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                The soul is too short to publish — go back to step 1.
              </p>
            )}
            {!guardrailsReady && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                Every guardrail needs a title and a checkable rule.
              </p>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Re-score after saving</p>
                <p className="text-xs text-muted-foreground">
                  Runs the same quality judge used in the build, so your edits get an honest grade.
                </p>
              </div>
              <Switch checked={rescore} onCheckedChange={setRescore} aria-label="Re-score after saving" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={saving || !soulReady || !guardrailsReady}>
                {saving ? (rescore ? "Saving and scoring…" : "Saving…") : "Save and publish changes"}
              </Button>
              {openIssues > 0 && <Badge variant="secondary">{openIssues} optional improvements left</Badge>}
            </div>
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" onClick={() => setStep((s) => Math.min(2, s + 1))} disabled={step === 2}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
