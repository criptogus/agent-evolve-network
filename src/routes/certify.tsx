import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, FileCheck, ShieldCheck } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";

export const Route = createFileRoute("/certify")({
  head: () => ({
    meta: [
      { title: "Certify any skill — Super Agent Skill" },
      {
        name: "description",
        content:
          "Run any skill file through the SuperAgentSkill review engine and get a permanent, verifiable audit badge — even for skills you host yourself. One POST, one badge, public verification.",
      },
      { property: "og:title", content: "Certify any skill file — audit badge as a service" },
      { property: "og:url", content: "https://superagentskill.com/certify" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/certify" }],
  }),
  component: CertifyPage,
});

const CURL_EXAMPLE = `curl -X POST https://superagentskill.com/api/public/certify \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "my-incident-response.md",
    "type": "skill",
    "content": "<paste the raw skill file here>"
  }'`;

const RESPONSE_EXAMPLE = `{
  "id": "0b7c…",
  "overall_score": 84,
  "grade": "B — solid, minor gaps",
  "content_sha256": "9f2a…",
  "badge_url": "https://superagentskill.com/api/badges/certified/0b7c….svg",
  "verify_url": "https://superagentskill.com/api/public/certifications/0b7c…",
  "embed_markdown": "[![skill audit](…/certified/0b7c….svg)](…/certifications/0b7c…)",
  "report": { "top_actions": [ … ], "injection_findings": { "severity": "none" } }
}`;

function CertifyPage() {
  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Certification API
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Certify any skill. Even ones we don't host.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          One POST runs your skill file through the same proprietary review engine behind the{" "}
          <code className="font-mono text-xs">review_skill</code> MCP tool — and issues a permanent
          audit badge bound to the file's SHA-256. Anyone holding the file can verify the badge
          refers to exactly that content. No account, no registry upload.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: FileCheck,
              title: "Content-bound",
              body: "The badge is keyed to the file's SHA-256 — change one byte and verification fails.",
            },
            {
              icon: ShieldCheck,
              title: "Injection-screened",
              body: "Submissions run through the prompt-injection guard; findings are recorded on the public verification record.",
            },
            {
              icon: BadgeCheck,
              title: "Embeddable anywhere",
              body: "A shields-style SVG for your README, docs or marketplace listing — every impression links back to the verification record.",
            },
          ].map((h) => (
            <div key={h.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <h.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{h.title}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{h.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-semibold tracking-tight">1. Submit the file</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pass the raw file content — not a summary. Up to 120k characters; 10 certifications per
          hour per IP.
        </p>
        <div className="mt-4">
          <CodeBlock filename="certify.sh" lang="bash" code={CURL_EXAMPLE} />
        </div>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">2. Get the badge</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The response includes the score, the grade, the permanent badge URL and a ready-to-paste
          markdown snippet.
        </p>
        <div className="mt-4">
          <CodeBlock filename="response.json" lang="json" code={RESPONSE_EXAMPLE} />
        </div>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">3. Anyone can verify</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The verification record at <code className="font-mono text-xs">verify_url</code> is
          public. A reviewer hashes the file they were given (
          <code className="font-mono text-xs">sha256sum my-skill.md</code>) and compares it with{" "}
          <code className="font-mono text-xs">content_sha256</code> — a match proves this exact
          content earned this score on the issued date.
        </p>

        <section className="mt-12 rounded-2xl border border-border bg-surface/40 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Audit badge vs. Trust Score
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The <span className="text-foreground">skill audit</span> badge scores the content
            itself. The registry <span className="text-foreground">Trust Score</span> goes further —
            adversarial pass rate per attack class, real-world success telemetry and Ed25519-signed
            releases. To earn the full Trust Score,{" "}
            <Link to="/upload" className="text-primary hover:underline">
              publish your skill to the registry
            </Link>
            .
          </p>
        </section>
      </main>
    </SitePage>
  );
}
