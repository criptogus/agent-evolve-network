import { Link } from "@tanstack/react-router";
import {
  Lock,
  EyeOff,
  Server,
  FileKey,
  Fingerprint,
  ShieldCheck,
  ScrollText,
  Building2,
} from "lucide-react";

const items = [
  {
    Icon: Lock,
    title: "You keep full ownership",
    body: "Your source code, prompts and context remain your property. We claim no rights to proprietary skills you upload or generate inside your workspace.",
  },
  {
    Icon: EyeOff,
    title: "No unauthorized training",
    body: "We never use submitted skills, docs or transcripts to train shared models, create competing products, or build look-alike packages.",
  },
  {
    Icon: Server,
    title: "Isolated evaluation sandbox",
    body: "Certification runs inside a sandboxed environment. Other users can't peek at your code, and test artifacts are purged after scoring.",
  },
  {
    Icon: FileKey,
    title: "Signed, verifiable releases",
    body: "Every published artifact is Ed25519-signed. Buyers see metadata and Trust Score — not your source — unless you explicitly open-source it.",
  },
  {
    Icon: Fingerprint,
    title: "Row-level access control",
    body: "Database access is scoped per user via RLS. Your private packages, billing data and execution logs are invisible to other accounts by default.",
  },
  {
    Icon: ShieldCheck,
    title: "Encrypted in transit & at rest",
    body: "TLS protects data in flight. Sensitive storage is encrypted at rest. Audit logs record every package access and administrative action.",
  },
  {
    Icon: ScrollText,
    title: "Exportable audit trail",
    body: "Review who accessed what, when. Enterprise plans include full audit-log exports and tamper-evident signing history for compliance.",
  },
  {
    Icon: Building2,
    title: "Private registry & DPA/NDA",
    body: "Enterprise teams can run a fully private registry with SSO, custom contracts and a Data Processing Agreement. Your IP never touches the public marketplace.",
  },
];

export function SecurityPromise() {
  return (
    <section
      id="security-promise"
      className="relative overflow-hidden border-b border-border bg-surface/40 py-20 md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[24rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center chart-fade">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Security &amp; IP Promise
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Your proprietary skill stays <span className="text-primary">yours</span>.
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            We don't copy, train on, or resell your code. Every upload is signed, scoped to your
            workspace, and evaluated in an isolated sandbox.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <div
              key={it.title}
              className={`group rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-elevated chart-slide-up chart-delay-${(i + 1) * 100}`}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <it.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-border bg-background/60 p-5 text-center text-sm text-muted-foreground chart-fade chart-delay-900">
          <p>
            <span className="font-medium text-foreground">Need a private registry?</span>{" "}
            Enterprise teams keep every skill inside their own workspace with SSO, audit logs and a
            custom DPA/NDA.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/enterprise"
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Talk to sales →
            </Link>
            <Link
              to="/privacy"
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Read privacy policy →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
