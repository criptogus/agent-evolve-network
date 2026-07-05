import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/enterprise")({
  component: EnterprisePage,
  head: () => ({
    meta: [
      { title: "Enterprise · Super Agent Skill" },
      {
        name: "description",
        content:
          "A signed skill supply chain your security team can audit: Ed25519-signed releases, adversarial testing, offline-verifiable trust attestations and a transparent Trust Score.",
      },
    ],
  }),
});

const WEIGHTS: Array<{ key: string; label: string; weight: number; note: string }> = [
  { key: "adv_weighted", label: "Adversarial severity-weighted score", weight: 0.25, note: "Failures on critical attack classes cost 8x more than low-severity ones." },
  { key: "adv_pass", label: "Adversarial pass rate", weight: 0.20, note: "Share of curated attack cases (injection, exfiltration, policy bypass) the package refuses correctly." },
  { key: "real_world", label: "Real-world success rate", weight: 0.20, note: "Anonymized execution telemetry from live agent runs over the last 30 days." },
  { key: "schema", label: "Schema validity", weight: 0.10, note: "Package validates against the public content schema." },
  { key: "signed", label: "Signed releases", weight: 0.10, note: "Ed25519-signed versions; full credit at 3+ signed releases." },
  { key: "age", label: "Package age", weight: 0.05, note: "Logarithmic — longevity helps but cannot buy trust." },
  { key: "ownership", label: "Owner 2FA", weight: 0.05, note: "Publisher account protected with two-factor authentication." },
  { key: "contributors", label: "Contributor count", weight: 0.05, note: "More independent eyes on the package, capped at 5." },
];

function EnterprisePage() {
  const mailto =
    "mailto:enterprise@superagentskill.com?subject=Trust%20Score%20walkthrough%20request";

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-12">
        {/* Hero */}
        <header className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              For security &amp; compliance teams
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            A skill supply chain your security team can actually audit.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every package is Ed25519-signed, adversarially tested before publish, and scored by a
            public, transparent Trust Score formula. Signatures and trust attestations verify{" "}
            <span className="font-medium text-foreground">offline</span> — no need to trust our
            hosted endpoints, even in air-gapped environments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={mailto}
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
            >
              Book a Trust Score walkthrough
            </a>
            <Link
              to="/whitepaper"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium transition-colors hover:border-primary/40"
            >
              Read the security whitepaper
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <HeroStat label="Release signing" value="Ed25519" />
            <HeroStat label="Verification" value="Offline" />
            <HeroStat label="Trust formula" value="Public" />
            <HeroStat label="Re-testing" value="Continuous" />
          </div>
        </header>

        {/* How verification works */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">How verification works</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Four independent layers, each of which your team can inspect or reproduce.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card
              step="01"
              title="Ed25519-signed releases"
              body="Every published version is cryptographically signed with the release key. The signature binds the exact content bytes — a single changed character fails verification. Verify offline with npm run release:verify; no network, no registry trust required."
            />
            <Card
              step="02"
              title="Adversarial harness"
              body="Before a package can publish, it is benchmarked against curated attack cases — prompt injection, jailbreaks, data exfiltration, policy bypass, PII/PHI leakage — with an LLM judge scoring whether the package actually refused, not just whether it used refusal keywords. Cases are curated per vertical (OWASP LLM, FINRA, HIPAA Safe Harbor, PCI-DSS, SRE)."
            />
            <Card
              step="03"
              title="Transparent Trust Score"
              body="The score is a public weighted formula over objective signals — the weights are below, the code is open source (src/lib/trust/score.ts). Unproven signals default to a conservative 0.3 prior, and evidence older than 180 days decays back toward that prior, so no package coasts on a stale benchmark. Each score ships with a confidence figure: how much is evidence-backed vs. assumed."
            />
            <Card
              step="04"
              title="SkillForge continuous re-testing"
              body="Published packages are re-scored against the live adversarial suite and real execution telemetry. When robustness drops, SkillForge flags drift and proposes patches — trust is earned per version, continuously, not granted once at publish time."
            />
          </div>

          {/* Trust Score formula */}
          <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Trust Score component</th>
                  <th className="px-5 py-3">Weight</th>
                  <th className="px-5 py-3">What it measures</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map((w) => (
                  <tr key={w.key} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3 font-medium">{w.label}</td>
                    <td className="px-5 py-3 font-mono">{(w.weight * 100).toFixed(0)}%</td>
                    <td className="px-5 py-3 text-muted-foreground">{w.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Badge thresholds: green &ge; 0.85 · yellow &ge; 0.70 · orange &ge; 0.50 · red below.
            The full implementation is open source in{" "}
            <code className="rounded bg-muted px-1 py-0.5">src/lib/trust/score.ts</code>.
          </p>
        </section>

        {/* Verify before you buy */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Verify before you buy</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every package can ship with a signed trust attestation: a JSON document that binds the
            package&apos;s exact SHA-256 content hash and version to its adversarial result, signed
            with the Ed25519 release key. Your security team verifies it offline with nothing but
            the package file, the attestation and our public key.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold">Download a sample attestation</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Same shape as production output from{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run trust:attest</code>.
                Signature values are clearly marked placeholders — it will (correctly) fail
                verification, which is itself a demo of the verifier.
              </p>
              <a
                href="/sample-trust-attestation.json"
                download
                className="mt-4 inline-flex h-10 items-center rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Download sample-trust-attestation.json
              </a>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold">Verify offline</h3>
              <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
{`# nothing but Node — no network, no registry trust
npm run trust:verify -- \\
  --attestation code-reviewer.trust.json \\
  --pkg code-reviewer.yaml \\
  --pubkey pub.pem

# exits non-zero if the file was tampered with
# or the signature is invalid`}
              </pre>
              <p className="mt-3 text-sm text-muted-foreground">
                The verifier checks the public key fingerprint, recomputes the content hash and
                validates the Ed25519 signature over a canonicalized payload.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Built for regulated verticals</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Souls and guardrails encode the behavioral constraints your auditors ask about, and the
            adversarial suite includes vertical-specific attack cases for fintech, healthcare,
            security, and DevOps.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ComplianceCard
              title="Financial services"
              items={[
                "Fintech Compliance Officer soul (SEC, FINRA, PCI-DSS, CFPB)",
                "Adversarial cases: unlicensed investment advice, card-number leakage",
                "No PII in Output guardrail (emails, SSNs, card numbers)",
              ]}
            />
            <ComplianceCard
              title="Healthcare"
              items={[
                "HIPAA-Aware Clinical Liaison soul (Safe Harbor de-identification)",
                "Adversarial cases: PHI leakage, diagnosis-request refusal",
                "No Medical Advice guardrail (no diagnoses, drugs or dosages)",
              ]}
            />
            <ComplianceCard
              title="Audit & security"
              items={[
                "SOC 2 Type II Auditor soul (Trust Services Criteria)",
                "OWASP-LLM-aligned attack classes in the harness",
                "Public SECURITY.md disclosure policy",
              ]}
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold">Telemetry &amp; data flow</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Skill lookups go from your agent to the MCP gateway over HTTPS; the gateway returns
                signed package content from the public registry. The CLI sends anonymized install
                telemetry only — disable it entirely with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPER_AGENT_TELEMETRY=0</code>.
                Raw adversarial cases and telemetry never leave the platform; only aggregate
                scores are published.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold">Air-gapped friendly</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Release-bundle signatures and trust attestations verify with dependency-free Node
                scripts. Hand your security team the package file, the attestation and the public
                key — they can confirm exactly what was tested, with no network access at all.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 rounded-lg border border-primary/30 bg-primary/5 p-8 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            See the Trust Score on your own use case
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            We&apos;ll walk your security team through the signing pipeline, the adversarial
            harness and a live attestation verification — on a package relevant to your vertical.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={mailto}
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
            >
              Book a Trust Score walkthrough
            </a>
            <Link
              to="/whitepaper"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium transition-colors hover:border-primary/40"
            >
              Read the security whitepaper
            </Link>
            <Link
              to="/evaluation"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium transition-colors hover:border-primary/40"
            >
              Browse live evaluation data
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function Card({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="font-mono text-xs text-primary">{step}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ComplianceCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
