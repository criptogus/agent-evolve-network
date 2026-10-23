import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/whitepaper")({
  component: WhitepaperPage,
  head: () => ({
    meta: [
      { title: "AI Skill Supply-Chain Security · Super Agent Skill" },
      {
        name: "description",
        content:
          "Whitepaper: the threat model for AI agent skill supply chains, and how Ed25519 signing, adversarial testing and transparent trust scoring mitigate each threat.",
      },
    ],
  }),
});

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-24 text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 text-lg font-semibold tracking-tight">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

const TOC = [
  ["abstract", "Abstract"],
  ["threat-model", "1. Threat model"],
  ["mitigations", "2. Mitigations"],
  ["workflow", "3. Verification workflow"],
  ["shared-responsibility", "4. Shared-responsibility model"],
  ["conclusion", "5. Conclusion"],
] as const;

function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          <span className="font-mono uppercase tracking-wider text-muted-foreground">
            Security whitepaper
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          AI Skill Supply-Chain Security
        </h1>
        <p className="mt-3 text-muted-foreground">
          How Super Agent Skill secures the path from a published skill to your running agent:
          cryptographic signing, adversarial testing, transparent trust scoring, and continuous
          re-evaluation.
        </p>

        <nav className="mt-8 rounded-lg border border-border bg-surface p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</div>
          <ul className="mt-3 space-y-1.5">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted-foreground transition-colors hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <H2 id="abstract">Abstract</H2>
        <P>
          AI agents increasingly load third-party instructions — skills, playbooks, personas
          (souls) and guardrails — at runtime. These packages are natural-language programs: they
          direct model behavior with the same authority as first-party prompts. That makes the
          skill registry a supply chain, and an unsigned, untested skill registry is the npm of
          2010: convenient, and one compromised package away from an incident. This document
          describes the threat model we design against and the controls the platform applies at
          publish time, at install time, and continuously after release.
        </P>

        <H2 id="threat-model">1. Threat model</H2>

        <H3>1.1 Prompt injection via package content</H3>
        <P>
          A skill's markdown body is fed to the model. A malicious or compromised package can
          embed instructions that override the agent's system prompt, exfiltrate conversation
          context, or redirect tool calls. Unlike code, the payload is prose — static scanners
          built for binaries do not see it.
        </P>

        <H3>1.2 Malicious or backdoored skills</H3>
        <P>
          An attacker publishes a package that behaves correctly in demos but leaks PII/PHI,
          gives unlicensed financial or medical advice, or bypasses stated policies under
          adversarial phrasing. The failure mode is behavioral, so it only appears under attack —
          which is why we test with attacks, not just happy-path examples.
        </P>

        <H3>1.3 Supply-chain tampering</H3>
        <P>
          Classic package-registry threats apply directly: account takeover of a publisher,
          modification of package content between review and delivery, a compromised registry or
          CDN serving different bytes than were tested, and version-substitution attacks where a
          benign version is reviewed but a different one is installed.
        </P>

        <H3>1.4 Trust decay</H3>
        <P>
          A package that passed testing a year ago may fail today: attack techniques evolve, the
          underlying models change, and maintainers drift. A one-time "verified" badge is a
          liability if nothing re-earns it.
        </P>

        <H2 id="mitigations">2. Mitigations</H2>

        <H3>2.1 Ed25519-signed releases (vs. tampering)</H3>
        <P>
          Every published version is signed with an Ed25519 release key. The signature covers the
          exact content bytes; verification (<Code>npm run release:verify</Code>) is a
          dependency-free Node script that runs offline. This defeats in-transit and at-rest
          tampering: what your security team reviewed is bit-for-bit what your agent loads, and a
          compromised registry cannot forge a valid signature.
        </P>

        <H3>2.2 Adversarial harness (vs. injection and malicious behavior)</H3>
        <P>
          Before publish, every package is benchmarked against a curated adversarial suite:
          prompt injection, jailbreaks, data exfiltration, blast-radius, policy bypass, and
          PII/PHI leakage cases, organized per vertical (OWASP LLM, FINRA, HIPAA Safe Harbor,
          PCI-DSS, SRE). Outcomes are judged by an LLM judge rather than keyword matching, because
          keyword heuristics miss polite-but-compliant answers and over-fire on outputs that
          merely quote refusal language. Each case carries a severity (low 1x, medium 2x, high
          4x, critical 8x), producing both a pass rate and a severity-weighted score.
        </P>

        <H3>2.3 Transparent Trust Score (vs. blind trust)</H3>
        <P>
          The Trust Score is a public weighted formula over objective signals — adversarial
          severity-weighted score (25%), adversarial pass rate (20%), real-world success rate
          (20%), schema validity (10%), signed releases (10%), package age (5%), owner 2FA (5%),
          contributor count (5%). Two properties matter for auditors: unproven signals default to
          a conservative 0.3 prior rather than a neutral 0.5, so untested packages cannot float
          into "acceptable" for free; and measured evidence decays linearly toward that prior over
          180 days, so no package coasts on a stale benchmark. Every score carries a confidence
          value stating how much of it is evidence-backed versus assumed. The implementation is
          open source (<Code>src/lib/trust/score.ts</Code>).
        </P>

        <H3>2.4 Signed trust attestations (vs. trusting our endpoints)</H3>
        <P>
          <Code>npm run trust:attest</Code> produces a JSON attestation binding a package's
          SHA-256 content hash and version to its adversarial result, canonicalized
          (recursively key-sorted) and signed with the release key. A consumer verifies it with{" "}
          <Code>npm run trust:verify</Code> using only the package file, the attestation and the
          publisher's public key — no network, no trust in the hosted Trust Score endpoint. The
          verifier checks the key fingerprint, recomputes the content hash, and validates the
          Ed25519 signature; any mismatch exits non-zero.
        </P>

        <H3>2.5 SkillForge continuous re-testing (vs. trust decay)</H3>
        <P>
          Published packages are periodically re-scored against the live adversarial suite and
          against anonymized execution telemetry (success rate, latency, drift, critical
          findings — visible on the public <Link to="/evaluation" className="text-primary hover:underline">Evaluation</Link>{" "}
          page). When robustness drops, the package is flagged and SkillForge proposes patches.
          Evidence-age decay in the Trust Score formula enforces the same principle numerically.
        </P>

        <H3>2.6 Guardrails and souls (defense in depth)</H3>
        <P>
          Behavioral constraints ship as first-class, individually tested packages: guardrails
          such as <Code>no-pii-in-output</Code> and <Code>no-medical-advice</Code> enforce output
          policy, while compliance souls (Fintech Compliance Officer, HIPAA-Aware Clinical
          Liaison, SOC 2 Type II Auditor) constrain persona-level behavior for regulated
          verticals. A skill failure is contained by the layers around it.
        </P>

        <H2 id="workflow">3. Verification workflow</H2>
        <P>A recommended evaluation flow for a security team assessing a package:</P>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>
            Review the public trust page at{" "}
            <Code>superagentskill.com/marketplace/trust/&lt;slug&gt;</Code>: adversarial pass rate,
            signature status, Trust Score breakdown and confidence.
          </li>
          <li>
            Obtain the package file and its signed attestation (<Code>&lt;slug&gt;.trust.json</Code>).
          </li>
          <li>
            Verify offline:{" "}
            <Code>npm run trust:verify -- --attestation pkg.trust.json --pkg pkg.yaml --pubkey pub.pem</Code>.
            A non-zero exit means tampering or an invalid signature.
          </li>
          <li>
            Cross-check the attested <Code>content_sha256</Code> against your own hash of the file
            you intend to deploy.
          </li>
          <li>
            Optionally re-run the adversarial suite yourself: the harness (
            <Code>scripts/eval-adversarial.mjs</Code>) and case corpus (
            <Code>content/adversarial/</Code>) are open source.
          </li>
          <li>
            Monitor post-deploy via the Evaluation page; treat critical findings or drift as a
            re-review trigger.
          </li>
        </ol>

        <H2 id="shared-responsibility">4. Shared-responsibility model</H2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Layer</th>
                <th className="px-5 py-3">Platform responsibility</th>
                <th className="px-5 py-3">Customer responsibility</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["Package integrity", "Sign every release; publish attestations and the public key", "Verify signatures/attestations before deploying; pin versions"],
                ["Behavioral safety", "Adversarial testing at publish; continuous re-scoring; public scores", "Choose Trust Score thresholds; layer guardrails and souls appropriate to your vertical"],
                ["Data flow", "HTTPS-only gateway; signed content; anonymized, opt-out telemetry", "Set SUPER_AGENT_TELEMETRY=0 if required; review what context your agent shares with skills"],
                ["Runtime", "Score real-world telemetry; flag drift and critical findings", "Least-privilege tool access for agents; monitor Evaluation data; re-review on drift"],
                ["Disclosure", "Public SECURITY.md and coordinated disclosure process", "Report suspected vulnerabilities through the SECURITY.md channel"],
              ].map(([layer, plat, cust]) => (
                <tr key={layer} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-5 py-3 font-medium text-foreground">{layer}</td>
                  <td className="px-5 py-3">{plat}</td>
                  <td className="px-5 py-3">{cust}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2 id="conclusion">5. Conclusion</H2>
        <P>
          No single control secures a natural-language supply chain. Signing proves what you got;
          adversarial testing proves how it behaves under attack; transparent scoring makes the
          evidence auditable; attestations make it verifiable without trusting us; continuous
          re-testing keeps all of it current. Each layer is independently inspectable — and the
          parts your auditors care about run offline, on your side of the boundary.
        </P>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-8">
          <Link
            to="/enterprise"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
          >
            Enterprise overview
          </Link>
          <a
            href="/sample-trust-attestation.json"
            download
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:border-primary/40"
          >
            Download sample attestation
          </a>
          <a
            href="https://github.com/criptogus/agent-evolve-network/blob/main/SECURITY.md"
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:border-primary/40"
          >
            SECURITY.md
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
