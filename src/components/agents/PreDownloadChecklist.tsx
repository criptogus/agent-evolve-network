import { useMemo, useState } from "react";
import { Check, ShieldAlert, FileOutput, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type Guardrail = {
  slug: string;
  title: string;
  rule: string;
  why?: string;
  blocked_example?: string;
  instead?: string;
};

type Doc = { slug: string; title: string; summary?: string; body?: string };

/** Pull an H2 section body out of a markdown document. */
function section(body: string | undefined, heading: string): string | null {
  if (!body) return null;
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, "im");
  const m = body.match(re);
  const text = m?.[1]?.trim();
  return text ? text : null;
}

function firstLines(text: string, n = 6): string {
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, n)
    .join("\n");
}

/**
 * Pre-download validation: what the agent will refuse (guardrails, with a
 * concrete blocked request and the fallback behaviour) and what it will hand
 * back (output contracts pulled from the soul and every skill/playbook).
 */
export function PreDownloadChecklist({
  guardrails,
  soul,
  skills,
  playbooks,
}: {
  guardrails?: Guardrail[] | null;
  soul?: string | null;
  skills?: Doc[] | null;
  playbooks?: Doc[] | null;
}) {
  const rails = guardrails ?? [];
  const [acked, setAcked] = useState<Record<string, boolean>>({});

  const contracts = useMemo(() => {
    const out: { key: string; kind: string; title: string; body: string }[] = [];
    const soulContract = section(soul ?? undefined, "Output contract");
    if (soulContract) out.push({ key: "soul", kind: "Soul", title: "Every response", body: firstLines(soulContract, 8) });
    for (const d of [...(skills ?? []), ...(playbooks ?? [])]) {
      const fmt = section(d.body, "Output format") ?? section(d.body, "Output contract");
      if (fmt) {
        out.push({
          key: d.slug,
          kind: (skills ?? []).some((s) => s.slug === d.slug) ? "Skill" : "Playbook",
          title: d.title,
          body: firstLines(fmt, 6),
        });
      }
    }
    return out;
  }, [soul, skills, playbooks]);

  if (rails.length === 0 && contracts.length === 0) return null;

  const ackedCount = rails.filter((g) => acked[g.slug]).length;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Validate before you download</CardTitle>
        <CardDescription>
          What this agent will refuse, and exactly what it hands back. Tick each rule you're happy with —
          {" "}
          {ackedCount}/{rails.length} reviewed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {rails.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
              Guardrails — what gets blocked ({rails.length})
            </h3>
            <ul className="mt-3 space-y-3">
              {rails.map((g) => {
                const on = !!acked[g.slug];
                return (
                  <li key={g.slug} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`gr-${g.slug}`}
                        checked={on}
                        onCheckedChange={(v) => setAcked((s) => ({ ...s, [g.slug]: !!v }))}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`gr-${g.slug}`}
                          className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium"
                        >
                          {g.title}
                          {on && (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" aria-hidden /> reviewed
                            </Badge>
                          )}
                        </label>
                        <p className="mt-1 text-sm">{g.rule}</p>
                        {g.why && <p className="mt-1 text-xs text-muted-foreground">{g.why}</p>}
                        {(g.blocked_example || g.instead) && (
                          <div className="mt-3 space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
                            {g.blocked_example && (
                              <p>
                                <span className="font-medium text-destructive">Blocked example: </span>
                                <span className="text-muted-foreground">“{g.blocked_example}”</span>
                              </p>
                            )}
                            {g.instead && (
                              <p className="flex items-start gap-1.5">
                                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
                                <span>
                                  <span className="font-medium">Instead: </span>
                                  <span className="text-muted-foreground">{g.instead}</span>
                                </span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {contracts.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileOutput className="h-4 w-4 text-primary" aria-hidden />
              Output contracts — what the agent delivers ({contracts.length})
            </h3>
            <ul className="mt-3 space-y-3">
              {contracts.map((c) => (
                <li key={`${c.kind}-${c.key}`} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{c.kind}</Badge>
                    <span className="text-sm font-medium">{c.title}</span>
                  </div>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    {c.body}
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
