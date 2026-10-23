/**
 * 5-step skill creation wizard following Anthropic's "Complete Guide to Building Skills for Claude":
 *   1. Use case   — what problem, who is the user
 *   2. Triggers   — when should the skill activate (description "WHEN" clause)
 *   3. Structure  — type, vertical, must / must-not rules
 *   4. Examples   — at least 2 worked input/output pairs
 *   5. Validation — review compiled brief, run author + spec validation
 *
 * Output: a single rich brief string that the existing authorPackage() pipeline
 * can consume (it already runs research → draft → spec-fix → critique → adversarial → verify).
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PackageType = "skill" | "playbook" | "soul" | "guardrail";

export type WizardSubmit = {
  brief: string;
  type: PackageType;
  vertical?: string;
  publish: boolean;
};

const STEPS = ["Use case", "Triggers", "Structure", "Examples", "Validation"] as const;

const TRIGGER_HINT = /\b(use when|when (the )?user|trigger|asks? (to|for)|invoke when|mentions?)\b/i;

export function SkillWizard({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (s: WizardSubmit) => void;
}) {
  const [step, setStep] = useState(0);

  // step 1 — use case
  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");

  // step 2 — triggers
  const [whenPhrase, setWhenPhrase] = useState("Use when the user asks to ");
  const [exampleQueries, setExampleQueries] = useState("");
  const [antiTriggers, setAntiTriggers] = useState("");

  // step 3 — structure
  const [type, setType] = useState<PackageType>("skill");
  const [vertical, setVertical] = useState("");
  const [must, setMust] = useState("");
  const [mustNot, setMustNot] = useState("");

  // step 4 — examples
  const [ex1In, setEx1In] = useState("");
  const [ex1Out, setEx1Out] = useState("");
  const [ex2In, setEx2In] = useState("");
  const [ex2Out, setEx2Out] = useState("");

  // step 5
  const [publish, setPublish] = useState(false);

  const checks = useMemo(() => {
    const c: { label: string; ok: boolean; hint?: string }[] = [];
    c.push({ label: "Problem described (≥ 30 chars)", ok: problem.trim().length >= 30 });
    c.push({ label: "Target user defined", ok: audience.trim().length >= 3 });
    c.push({ label: "Success outcome defined", ok: outcome.trim().length >= 10 });
    c.push({
      label: 'Trigger phrase contains "use when / when user…"',
      ok: TRIGGER_HINT.test(whenPhrase),
      hint: "Anthropic spec requires explicit WHEN to activate.",
    });
    c.push({ label: "≥ 2 example queries listed", ok: exampleQueries.split("\n").filter(Boolean).length >= 2 });
    c.push({ label: "≥ 1 must rule", ok: must.split("\n").filter(Boolean).length >= 1 });
    c.push({ label: "≥ 1 must-not rule", ok: mustNot.split("\n").filter(Boolean).length >= 1 });
    c.push({ label: "Example #1 input + expected output", ok: ex1In.trim().length > 5 && ex1Out.trim().length > 5 });
    c.push({ label: "Example #2 input + expected output", ok: ex2In.trim().length > 5 && ex2Out.trim().length > 5 });
    c.push({ label: "No `<` or `>` in trigger (prompt-injection guard)", ok: !/[<>]/.test(whenPhrase) });
    return c;
  }, [problem, audience, outcome, whenPhrase, exampleQueries, must, mustNot, ex1In, ex1Out, ex2In, ex2Out]);

  const allOk = checks.every((c) => c.ok);

  const compiledBrief = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# Use case`, problem.trim(), "");
    lines.push(`**Target user:** ${audience.trim()}`);
    lines.push(`**Successful outcome:** ${outcome.trim()}`, "");
    lines.push(`# When to activate (triggers)`);
    lines.push(whenPhrase.trim(), "");
    if (exampleQueries.trim()) {
      lines.push(`**Example user queries that should activate this:**`);
      exampleQueries.split("\n").filter(Boolean).forEach((q) => lines.push(`- ${q.trim()}`));
      lines.push("");
    }
    if (antiTriggers.trim()) {
      lines.push(`**Do NOT activate when:**`);
      antiTriggers.split("\n").filter(Boolean).forEach((q) => lines.push(`- ${q.trim()}`));
      lines.push("");
    }
    lines.push(`# Structure`);
    lines.push(`- Type: ${type}`);
    if (vertical.trim()) lines.push(`- Vertical: ${vertical.trim()}`);
    if (must.trim()) {
      lines.push(`**Must:**`);
      must.split("\n").filter(Boolean).forEach((r) => lines.push(`- ${r.trim()}`));
    }
    if (mustNot.trim()) {
      lines.push(`**Must not:**`);
      mustNot.split("\n").filter(Boolean).forEach((r) => lines.push(`- ${r.trim()}`));
    }
    lines.push("", `# Worked examples`);
    lines.push(`## Example 1`, `Input:`, ex1In.trim(), `Expected output:`, ex1Out.trim(), "");
    lines.push(`## Example 2`, `Input:`, ex2In.trim(), `Expected output:`, ex2Out.trim(), "");
    return lines.join("\n");
  }, [problem, audience, outcome, whenPhrase, exampleQueries, antiTriggers, type, vertical, must, mustNot, ex1In, ex1Out, ex2In, ex2Out]);

  const submit = () => {
    onSubmit({ brief: compiledBrief, type, vertical: vertical.trim() || undefined, publish });
  };

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full border px-3 py-1 text-xs ${
                i === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < step
                    ? "bg-surface border-border text-foreground"
                    : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <div>
            <Label>What problem does this skill solve?</Label>
            <Textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Be concrete. e.g. Convert ad-hoc product requests into Meta Ads campaign briefs aligned with brand voice."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target user</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="growth marketer, SRE, support agent…" />
            </div>
            <div>
              <Label>Successful outcome</Label>
              <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. shipped campaign brief in &lt; 2 minutes" />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <Label>WHEN should this skill activate?</Label>
            <Textarea
              rows={2}
              value={whenPhrase}
              onChange={(e) => setWhenPhrase(e.target.value)}
              placeholder='e.g. "Use when the user asks to draft a Meta Ads campaign brief or create paid social ad copy."'
            />
            <p className="text-xs text-muted-foreground mt-1">
              Anthropic spec requires the description to include explicit trigger phrases like <em>"Use when…"</em>.
            </p>
          </div>
          <div>
            <Label>Example user queries that should trigger it (one per line)</Label>
            <Textarea
              rows={4}
              value={exampleQueries}
              onChange={(e) => setExampleQueries(e.target.value)}
              placeholder={"Draft a Meta Ads campaign for our Black Friday launch\nWrite 3 ad variations for our checkout offer"}
            />
          </div>
          <div>
            <Label>Anti-triggers — when it should NOT activate (optional)</Label>
            <Textarea
              rows={2}
              value={antiTriggers}
              onChange={(e) => setAntiTriggers(e.target.value)}
              placeholder={"Generic copywriting unrelated to paid ads\nGoogle Ads (use the google-ads skill)"}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PackageType)}>
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
              <Input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="paid-social, devops, cardiology…" />
            </div>
          </div>
          <div>
            <Label>Must — non-negotiable rules (one per line)</Label>
            <Textarea
              rows={4}
              value={must}
              onChange={(e) => setMust(e.target.value)}
              placeholder={"Always cite the underlying Meta Ads object IDs\nReturn structured JSON matching the campaign schema"}
            />
          </div>
          <div>
            <Label>Must NOT (one per line)</Label>
            <Textarea
              rows={4}
              value={mustNot}
              onChange={(e) => setMustNot(e.target.value)}
              placeholder={"Never invent ad account IDs\nNever recommend disallowed targeting (health, politics)"}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Two worked examples ground the evaluator. Inputs should look like a real user message; expected outputs are
            the gold standard.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Example 1 — input</Label>
              <Textarea rows={4} value={ex1In} onChange={(e) => setEx1In(e.target.value)} />
              <Label>Example 1 — expected output</Label>
              <Textarea rows={4} value={ex1Out} onChange={(e) => setEx1Out(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Example 2 — input</Label>
              <Textarea rows={4} value={ex2In} onChange={(e) => setEx2In(e.target.value)} />
              <Label>Example 2 — expected output</Label>
              <Textarea rows={4} value={ex2Out} onChange={(e) => setEx2Out(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Pre-flight checks</p>
            <ul className="space-y-1 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  <span>{c.ok ? "✅" : "⚠️"}</span>
                  <span className={c.ok ? "" : "text-muted-foreground"}>
                    {c.label}
                    {c.hint && !c.ok ? <span className="ml-1 text-xs">— {c.hint}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Compiled brief sent to the author pipeline</summary>
            <pre className="text-xs whitespace-pre-wrap mt-2">{compiledBrief}</pre>
          </details>
          <div className="flex items-center gap-2">
            <input id="wpub" type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            <Label htmlFor="wpub">Publish to marketplace as stable</Label>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allOk ? "default" : "secondary"}>{allOk ? "Ready to author" : "Fix the warnings above"}</Badge>
            <Button disabled={!allOk || busy} onClick={submit}>
              {busy ? "Authoring…" : "Run SkillForge author"}
            </Button>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Next →</Button>
        ) : (
          <span className="text-xs text-muted-foreground">Step {step + 1} / {STEPS.length}</span>
        )}
      </div>
    </div>
  );
}
