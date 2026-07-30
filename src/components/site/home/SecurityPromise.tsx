import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Brain,
  Container,
  FileSignature,
  Lock,
  ShieldCheck,
  Shield,
  Users,
} from "lucide-react";

const guarantees = [
  {
    Icon: BadgeCheck,
    title: "You keep ownership",
    body: "Your copyright and IP never transfer to Super Agent Skill. Our terms explicitly disclaim ownership of anything you upload.",
  },
  {
    Icon: Brain,
    title: "No unauthorized training",
    body: "Uploaded skills are not used to train shared models. They are stored, signed and served only to authorized callers.",
  },
  {
    Icon: Container,
    title: "Isolated execution sandbox",
    body: "Certification runs inside a sandboxed harness with no access to your production keys, network or data stores.",
  },
  {
    Icon: FileSignature,
    title: "Signed releases",
    body: "Every published package is signed with Ed25519. The signature, content hash and timestamp are public and auditable.",
  },
  {
    Icon: Shield,
    title: "Row Level Security",
    body: "Every table has RLS enabled. A skill is only readable by its author, paying install base, or public when you explicitly publish it.",
  },
  {
    Icon: Lock,
    title: "Encryption in transit & at rest",
    body: "All traffic is TLS 1.3. Stored package contents and audit logs are encrypted at rest by the backend provider.",
  },
  {
    Icon: Users,
    title: "Audit trail by default",
    body: "Releases, reviews, injection tests and credit movements are append-only. Enterprise plans can export them or stream to SIEM.",
  },
  {
    Icon: ShieldCheck,
    title: "Private registry & NDA",
    body: "Enterprise teams can run a private registry with SSO and a custom DPA/NDA. Your proprietary skills never touch public indexes.",
  },
];

export function SecurityPromise() {
  return (
    <section className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Security & IP promise
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Your proprietary skill stays yours.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We built Super Agent Skill so teams can safely upload, certify and share agent skills
              without giving away the recipe. Here is exactly what that means.
            </p>
          </div>
          <Link
            to="/security"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95"
          >
            Verify the evidence →
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guarantees.map((g, i) => (
            <div
              key={g.title}
              className="chart-fade rounded-2xl border border-border bg-background p-5 shadow-sm"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <g.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Need a private registry?</span>{" "}
            Enterprise teams keep every skill inside their own workspace with SSO, audit logs and a
            custom DPA/NDA.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/security"
              className="inline-flex h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Verify the evidence →
            </Link>
            <Link
              to="/enterprise/request"
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Request access under NDA →
            </Link>
            <Link
              to="/privacy"
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Privacy policy →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
