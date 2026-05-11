import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const SELLER = "Super Agent Skill, Inc.";
const SUPPORT_EMAIL = "support@superagentskill.com";
const EFFECTIVE = "May 10, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — Super Agent Skill" },
      {
        name: "description",
        content:
          "How Super Agent Skill collects, uses, shares and protects your personal data, including your GDPR/UK rights.",
      },
      { property: "og:title", content: "Privacy Notice — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Categories of personal data, purposes, legal basis, sharing with sub-processors, retention and your rights.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Privacy Notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE}</p>

        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Who we are">
            <p>
              <strong>{SELLER}</strong> (“we”, “us”, the “Seller”) operates Super Agent Skill, the
              registry and MCP server available at superagentskill.com. We act as the
              <strong> data controller</strong> for personal data processed in connection with
              your use of the Service. For privacy questions, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Personal data we collect">
            <p>We collect the following categories of personal data:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li><strong>Account data:</strong> name, email, login credentials (hashed), avatar,
                  handle, optional bio.</li>
              <li><strong>Authentication tokens:</strong> personal MCP tokens stored as a
                  one-way SHA-256 hash with a non-secret prefix used for display.</li>
              <li><strong>User content:</strong> packages, prompts, rules, examples, evaluation
                  notes and submissions you publish or upload.</li>
              <li><strong>Usage and telemetry:</strong> runs you trigger, evaluation results,
                  health and latency metrics, API/MCP request logs.</li>
              <li><strong>Device and connection data:</strong> IP address, user agent, language,
                  timestamps, and cookies strictly necessary for authentication.</li>
              <li><strong>Support communications:</strong> messages you send us and our replies.</li>
            </ul>
            <p>
              Payment data (card numbers, billing addresses) is collected and processed
              <strong> directly by Stripe</strong>, our payment processor. We do not receive
              or store full card numbers.
            </p>
          </Section>

          <Section title="3. Purposes and legal basis">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Purpose</th>
                  <th className="py-2 font-semibold">Legal basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <Row p="Create and manage your account" b="Contract" />
                <Row p="Provide the registry and MCP server, run evaluations and metrics" b="Contract" />
                <Row p="Authenticate API/MCP requests via tokens" b="Contract" />
                <Row p="Prevent fraud, abuse and security incidents; rate-limit; investigate misuse" b="Legitimate interests" />
                <Row p="Improve and debug the Service" b="Legitimate interests" />
                <Row p="Provide customer support" b="Contract / legitimate interests" />
                <Row p="Comply with tax, accounting and legal obligations" b="Legal obligation" />
                <Row p="Send transactional emails (e.g. review approval)" b="Contract" />
                <Row p="Send product updates or marketing (where applicable)" b="Consent (you can withdraw at any time)" />
              </tbody>
            </table>
          </Section>

          <Section title="4. Who we share your data with">
            <ul className="ml-6 list-disc space-y-1">
              <li><strong>Hosting and infrastructure providers</strong> that operate the
                  application, database, file storage and AI gateway used to deliver the Service
                  (acting as our processors under written agreements).</li>
              <li><strong>Stripe</strong> — our payment processor — for card payments,
                  subscription billing, fraud prevention, and invoicing. Stripe acts as an
                  independent controller for the personal data it processes; see Stripe's{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    privacy policy
                  </a>
                  .</li>
              <li><strong>Professional advisers</strong> (legal, accounting, auditors) under
                  duties of confidentiality.</li>
              <li><strong>Authorities</strong> when required by law, court order, or to protect
                  rights, property or safety.</li>
              <li><strong>Successors</strong> in the event of a merger, acquisition, or sale of
                  assets, subject to confidentiality.</li>
            </ul>
            <p>We do not sell your personal data.</p>
          </Section>

          <Section title="5. International transfers">
            <p>
              Personal data may be processed in countries outside your own, including outside
              the United Kingdom and the European Economic Area. When we transfer personal data
              internationally, we rely on appropriate safeguards, such as Standard Contractual
              Clauses and adequacy decisions where available.
            </p>
          </Section>

          <Section title="6. Retention">
            <p>
              We keep personal data only for as long as needed for the purposes above. Account
              data is retained while your account is active and for a reasonable period
              afterwards to handle disputes, comply with legal obligations and enforce our
              agreements. Logs and telemetry are retained for a shorter operational window.
              Published packages remain in the registry until you remove them or your account
              is deleted, after which we delete or anonymise associated data.
            </p>
          </Section>

          <Section title="7. Your rights">
            <p>
              Depending on where you live, you may have the right to access, rectify, erase,
              restrict or object to the processing of your personal data, to data portability,
              and to withdraw consent at any time. Users in the UK or EEA may also lodge a
              complaint with their local supervisory authority. We aim to respond to requests
              within one month. Send requests to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We apply appropriate technical and organisational measures to protect your data,
              including encryption in transit (HTTPS/TLS), one-way hashing of API tokens,
              row-level security on the database, least-privilege access controls and audit
              logging. No method of transmission or storage is 100% secure; we will notify you
              and the relevant authorities of personal-data breaches as required by law.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              We use only <strong>essential cookies</strong> (and equivalent local-storage
              entries) needed to authenticate your session, remember your preferences (e.g. the
              last MCP token used in the in-browser tester, stored locally in your browser), and
              keep the Service secure. We do not use advertising or cross-site tracking cookies.
            </p>
          </Section>

          <Section title="10. Children">
            <p>The Service is not directed to children under 16, and we do not knowingly
              collect their personal data.</p>
          </Section>

          <Section title="11. Changes to this Notice">
            <p>
              We may update this Notice from time to time. Material changes will be announced
              on the Service. The “Effective” date at the top reflects the latest version.
            </p>
          </Section>
        </div>
      </article>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mt-8 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function Row({ p, b }: { p: string; b: string }) {
  return (
    <tr>
      <td className="py-2 pr-3 align-top">{p}</td>
      <td className="py-2 align-top text-muted-foreground">{b}</td>
    </tr>
  );
}
