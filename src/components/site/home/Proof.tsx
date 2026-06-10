import { Link } from "@tanstack/react-router";
import { ShieldCheck, BadgeCheck, Activity, RefreshCw } from "lucide-react";

export function Proof() {
  const items = [
    {
      Icon: ShieldCheck,
      title: "Attacked before it ships",
      plain: "Adversarial harness",
      body: "Every skill runs an adversarial gauntlet — prompt injection, jailbreaks, data exfiltration, policy bypass — before it can publish. Pass rate is public, per attack class.",
    },
    {
      Icon: BadgeCheck,
      title: "Signed, not just published",
      plain: "Ed25519 · offline-verifiable",
      body: "Releases are Ed25519-signed and verifiable offline. Your security team can check the math without trusting us.",
    },
    {
      Icon: Activity,
      title: "A score you can audit",
      plain: "Public formula",
      body: "Trust Score is a public, weighted formula — adversarial robustness, real-world success, signed releases, age. Embed the live badge in your README.",
    },
    {
      Icon: RefreshCw,
      title: "Gets better while you sleep",
      plain: "SkillForge",
      body: "SkillForge re-tests every skill daily and ships patched versions automatically — no retraining, no downtime, every install reversible and audited.",
    },
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Why it's different
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Anyone can publish a prompt. We publish proof.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            The hard part isn't writing a skill — it's convincing your security team it won't leak
            PII, accept a jailbreak, or hallucinate compliance text.
            <span className="text-foreground"> That's what we build.</span>
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <it.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">
                {it.plain}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">The flywheel:</span> every production
            execution feeds the Trust Score. Skills that survive real workloads bubble up; ones that
            drift get re-scored and patched automatically.
          </p>
          <Link
            to="/evaluation"
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            See how skills are evaluated →
          </Link>
        </div>
      </div>
    </section>
  );
}
