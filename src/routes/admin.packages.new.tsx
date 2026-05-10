import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { wizardCreatePackage } from "@/lib/admin/imports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/packages/new")({
  component: WizardPage,
});

function WizardPage() {
  const create = useServerFn(wizardCreatePackage);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"skill" | "playbook" | "soul" | "guardrail">("skill");
  const [industry, setIndustry] = useState("");
  const [tech, setTech] = useState("");
  const [biz, setBiz] = useState("");
  const [brief, setBrief] = useState("");
  const [publish, setPublish] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          type,
          industry: industry || undefined,
          technology: tech || undefined,
          business_area: biz || undefined,
          brief,
          publish,
        },
      }),
    onSuccess: () => navigate({ to: "/admin/packages" }),
  });

  const steps = ["Type", "Domain", "Brief", "Generate"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create primitive</h1>
        <p className="text-sm text-muted-foreground">
          Author a new skill / playbook / soul / guardrail using SkillForge meta-agent.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {i + 1}
            </span>
            <span>{s}</span>
            {i < steps.length - 1 && <span className="mx-1">›</span>}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Step {step + 1} · {steps[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="grid gap-2 md:grid-cols-4">
              {(["skill", "playbook", "soul", "guardrail"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-md border p-4 text-left transition-colors ${
                    type === t ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <div className="font-medium capitalize">{t}</div>
                  <div className="text-xs text-muted-foreground">
                    {t === "skill" && "A capability — how to do X."}
                    {t === "playbook" && "Multi-step decision flow."}
                    {t === "soul" && "Personality / values layer."}
                    {t === "guardrail" && "Hard safety boundary."}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">Industry</Label>
                <Input placeholder="e.g. Healthcare" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Technology</Label>
                <Input placeholder="e.g. SQL, FHIR, React" value={tech} onChange={(e) => setTech(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Business area</Label>
                <Input placeholder="e.g. Customer support" value={biz} onChange={(e) => setBiz(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label className="text-xs">Brief</Label>
              <Textarea
                rows={8}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe what this primitive should do, the tools it can use, the output format expected, edge cases…"
              />
              <p className="text-xs text-muted-foreground">{brief.length} / 4000 characters</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {type}</div>
                <div><span className="text-muted-foreground">Domain:</span> {[industry, tech, biz].filter(Boolean).join(" / ") || "—"}</div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-3">{brief}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={publish} onCheckedChange={setPublish} id="pub" />
                <Label htmlFor="pub" className="text-sm">Publish immediately</Label>
              </div>
              {m.isError && (
                <div className="text-xs text-destructive">{(m.error as Error)?.message}</div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 2 && brief.length < 20)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => m.mutate()} disabled={m.isPending}>
                {m.isPending ? "Generating with SkillForge…" : "Generate package"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
