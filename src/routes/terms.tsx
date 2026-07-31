import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { canonicalLink, SITE_URL } from "@/lib/seo/canonical";

const SELLER = "Super Agent Skill, Inc.";
const SUPPORT_EMAIL = "contact@zeroagency.ai";
const EFFECTIVE = "May 10, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Super Agent Skill" },
      {
        name: "description",
        content:
          "Terms governing your use of the Super Agent Skill registry and MCP server, including payment, acceptable use, and AI features.",
      },
      { property: "og:title", content: "Terms & Conditions — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Seller identification, acceptable use, IP, payments, and AI-specific terms.",
      },
      { property: "og:url", content: `${SITE_URL}/terms` },
    ],
    links: [canonicalLink("/terms")],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE}</p>

        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Who you are contracting with">
            <p>
              These Terms &amp; Conditions (the “Terms”) form a binding agreement between you
              (“you” or “User”) and <strong>{SELLER}</strong> (“we”, “us”, the “Seller”), the
              operator of the Super Agent Skill platform available at superagentskill.com
              (the “Service”). By creating an account, accessing, or continuing to use the
              Service, you agree to these Terms.
            </p>
          </Section>

          <Section title="2. The Service">
            <p>
              The Service is a registry and Model Context Protocol (MCP) server that lets users
              publish, discover, evaluate, and run agent primitives — skills, playbooks, souls
              and guardrails — for use with third-party AI agents and developer tools.
            </p>
          </Section>

          <Section title="3. Eligibility and accounts">
            <p>
              You must be of legal age to enter contracts in your jurisdiction, or have authority
              to bind the organisation on whose behalf you act. You are responsible for keeping
              your credentials and personal access tokens (including MCP tokens) confidential and
              for all activity under your account. Information you provide must be accurate and
              kept up to date.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to misuse the Service. In particular, you must not:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>use it for unlawful, fraudulent, deceptive, or harassing purposes;</li>
              <li>send spam or abusive content;</li>
              <li>infringe intellectual property, privacy, or other rights of third parties;</li>
              <li>upload malware, scrape at abusive rates, probe for vulnerabilities, or
                  circumvent technical limits, rate limits, or authentication;</li>
              <li>resell, redistribute, or expose the Service as a competing product without our
                  written consent.</li>
            </ul>
          </Section>

          <Section title="5. Generative AI — acceptable use, IP and disclaimers">
            <p>
              Parts of the Service generate, evaluate or transform content using AI models. When
              using these features:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li><strong>Prohibited content.</strong> No illegal content, child sexual abuse
                  material, non-consensual intimate imagery, deepfakes intended to deceive,
                  targeted harassment, hate speech, weapons or malware instructions, or content
                  designed to jailbreak or evade the safety controls of third-party models.</li>
              <li><strong>Your responsibility.</strong> You are responsible for the prompts you
                  submit, for the way you use the outputs, for verifying their accuracy, and for
                  ensuring you have the rights to any content you provide as input.</li>
              <li><strong>Inputs and outputs.</strong> You retain rights to your inputs and to
                  outputs you generate, subject to the rights of underlying model providers and
                  to these Terms. You grant us a limited licence to host, process and display
                  inputs and outputs solely to operate the Service.</li>
              <li><strong>Takedown.</strong> Rights-holders may report alleged infringement to
                  {" "}<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">{SUPPORT_EMAIL}</a>.
                  Repeat infringers will have their accounts terminated.</li>
              <li><strong>Moderation.</strong> We may remove, restrict, refuse to generate, or
                  filter content, and suspend accounts that violate these rules.</li>
              <li><strong>Accuracy.</strong> AI outputs may be inaccurate, incomplete, or
                  unsuitable for a given purpose. The Service is not a substitute for
                  professional advice (medical, legal, financial, or otherwise) and must not be
                  relied on for decisions that require regulated professional oversight without
                  independent human review.</li>
            </ul>
          </Section>

          <Section title="6. Intellectual property">
            <p>
              The Service, including the underlying software, documentation, branding and the
              structure and selection of the registry, is owned by {SELLER} and its licensors and
              is protected by intellectual-property laws. We grant you a limited, non-exclusive,
              non-transferable, revocable right to use the Service in accordance with these Terms
              and the plan you have purchased. No other rights are granted.
            </p>
          </Section>

          <section id="contributor-ip" className="scroll-mt-24">
            <h2 className="mt-8 text-lg font-semibold tracking-tight text-foreground">
              6.1 Contributor IP Assignment (read carefully)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Plain-English version:{" "}
              <Link to="/contributor-faq" className="text-primary underline-offset-2 hover:underline">
                Contributor FAQ — improved skills, updates &amp; redistribution
              </Link>
              .
            </p>
            <div className="mt-2 space-y-3">
              <p>
                <strong>By creating an account and by submitting any Contribution to the Service,
                you irrevocably assign to {SELLER} all right, title and interest — worldwide and
                for the full term of protection — in and to that Contribution</strong>, including
                all copyrights, database rights, patent rights, trade-secret rights, moral rights
                (waived to the maximum extent permitted by law) and any related rights.
              </p>
              <p>
                <strong>“Contribution”</strong> means any skill, playbook, soul, guardrail, pack,
                prompt, system prompt, evaluation, dataset, configuration, code, documentation,
                feedback, idea or other material that you publish, upload, submit for review,
                submit to be improved, or otherwise make available through the Service — whether
                in draft, private, or public form, and whether originated by you or generated with
                the help of the Service.
              </p>
              <p>
                As assignee, {SELLER} may use, reproduce, modify, adapt, translate, fork, combine,
                relicense, sublicense, distribute, sell, resell, monetise and exploit each
                Contribution in any medium and for any purpose, with no obligation of attribution,
                royalties, revenue share, notice or further consent, except as expressly stated in
                a separate written agreement signed by an officer of {SELLER} (for example, the
                70/30 split paid through the marketplace once a Contribution is published and
                purchased).
              </p>
              <p>
                You represent and warrant that (a) you have full authority to make this
                assignment, (b) each Contribution is your original work or you have all rights
                necessary to assign it, (c) the Contribution does not infringe any third-party
                intellectual property, privacy, publicity or contractual right, and (d) no
                employer, client or collaborator retains rights that would be inconsistent with
                this assignment.
              </p>
              <p>
                <strong>Why this exists.</strong> Multiple users iterate on, evaluate and improve
                the same primitives. To run the registry, ship updates, harden skills and resell
                them on your behalf, {SELLER} needs unambiguous ownership of the assets in the
                catalogue. This clause prevents disputes from contributors who later claim that an
                improved version of a skill they uploaded was “copied”. By signing up you accept
                that any work you place into the Service becomes platform IP, and you waive any
                claim of authorship, derivative-work infringement, or unfair competition based on
                {SELLER}’s subsequent use of that work.
              </p>
              <p>
                <strong>Browsing remains free.</strong> You do not need an account to read, search
                or evaluate listings. The assignment above only attaches to material you actively
                submit while signed in. If you do not agree with this clause, do not create an
                account and do not upload Contributions.
              </p>
              <p>
                Further assurances: you agree to sign any additional documents and take any
                further actions reasonably required to perfect or record this assignment, and you
                appoint {SELLER} as your attorney-in-fact, coupled with an interest, to do so on
                your behalf if you fail to act within thirty (30) days of a written request.
              </p>
            </div>
          </section>

          <Section title="7. Payments, subscriptions and billing">
            <p>
              Paid plans are sold by {SELLER}. Card payments are processed by our payment
              provider, Stripe. Pricing, billing frequency, and renewals are shown at checkout
              and on your billing page. Applicable taxes may be added at checkout.
            </p>
            <p>
              Refunds are governed by our <a href="/refunds" className="text-primary hover:underline">Refund Policy</a>.
            </p>
          </Section>

          <Section title="8. Service availability">
            <p>
              We aim to keep the Service available, but do not guarantee uninterrupted, secure
              or error-free operation. We may modify, suspend, or discontinue features at any
              time, and will use reasonable efforts to notify you of material changes.
            </p>
          </Section>

          <Section title="9. Suspension and termination">
            <p>
              We may suspend or terminate your access if you materially breach these Terms,
              fail to pay, create security or fraud risk, or repeatedly or seriously violate
              our policies. You may stop using the Service at any time. On termination, your
              right to use the Service ends; we may retain or delete your data as described in
              our <a href="/privacy" className="text-primary hover:underline">Privacy Notice</a>.
            </p>
          </Section>

          <Section title="10. Warranties and liability">
            <p>
              To the fullest extent permitted by law, the Service is provided “as is” and “as
              available”, and we disclaim all warranties, express or implied, including
              merchantability, fitness for a particular purpose, accuracy, reliability, and
              non-infringement. To the fullest extent permitted by law, our aggregate liability
              arising out of or relating to these Terms shall not exceed the fees you paid for
              the Service in the twelve (12) months preceding the event giving rise to the
              claim. Neither party shall be liable for indirect, consequential, special,
              incidental or punitive damages, including loss of profits, revenues, data or
              goodwill. Nothing in these Terms excludes liability for fraud, death or personal
              injury caused by negligence, or any liability that cannot be excluded by law.
            </p>

            <p className="mt-3">
              <strong>10.1 No liability for agent behaviour or outputs.</strong> The Service
              distributes <em>primitives</em> — skills, playbooks, souls and guardrails — that
              are executed by third-party AI models, agents, runtimes, MCP clients and tools
              that we do not control. We make no warranty that any primitive will produce
              correct, safe, complete, current, lawful, non-infringing or fit-for-purpose
              outputs. We are <strong>not responsible</strong> for any decision, action,
              omission, transaction, message, code, document, diagnosis, recommendation,
              valuation or other output generated by an agent that uses a primitive obtained
              through the Service, regardless of whether the primitive was authored by us, by a
              contributor, or improved by us under §6.
            </p>

            <p className="mt-3">
              <strong>10.2 No liability for guardrail failures.</strong> Guardrails are
              best-effort filters, policies and system prompts. They <strong>can and will fail,
              be bypassed, jailbroken, misconfigured, ignored by the underlying model, or
              produce false positives and false negatives</strong>. We do not warrant that any
              guardrail will block any particular content, behaviour, prompt injection,
              hallucination, leakage of sensitive data, or unsafe action. Guardrails are not a
              substitute for human review, your own compliance program, or domain-qualified
              professionals.
            </p>

            <p className="mt-3">
              <strong>10.3 No liability for playbooks, skills and souls.</strong> Playbooks,
              skills and souls are reusable instructions and configurations. They may contain
              errors, outdated information, biased or incomplete reasoning, insecure code,
              broken tool calls, or assumptions that do not apply to your context. You are
              solely responsible for evaluating, testing, adapting and supervising any
              primitive before relying on it, and for the consequences of running it inside
              your own systems or on behalf of third parties.
            </p>

            <p className="mt-3">
              <strong>10.4 No professional advice.</strong> Nothing produced by, or distributed
              through, the Service constitutes <strong>medical, dental, psychological, legal,
              tax, accounting, financial, investment, engineering, architectural,
              pharmaceutical, regulatory, safety-critical or other professional advice</strong>.
              Verticalised primitives (e.g. for medicine, law, finance, engineering) are
              templates, not licensed practice. You must consult a qualified, licensed
              professional in the relevant jurisdiction before acting on any output. We
              disclaim all liability for any reliance on outputs in a professional, regulated
              or safety-critical context.
            </p>

            <p className="mt-3">
              <strong>10.5 No liability for legal, judicial or regulatory outcomes.</strong>
              We are not a law firm and do not provide legal representation. We are not liable
              for any judicial, administrative, arbitral, regulatory, tax, immigration,
              licensing, intellectual-property, contractual, employment, criminal or
              compliance outcome — including fines, sanctions, lost cases, missed deadlines,
              invalid filings, unenforceable contracts, regulatory investigations, or damages
              awarded against you — arising from your use of, or reliance on, any primitive,
              output, evaluation, score, label, badge, vertical tag or recommendation
              available through the Service.
            </p>

            <p className="mt-3">
              <strong>10.6 No liability for third-party models and infrastructure.</strong>
              The Service relies on third-party model providers, hosting providers, MCP
              clients, IDEs and other infrastructure. We are not liable for their downtime,
              changes, content policies, pricing, data handling, or for any output, refusal,
              or behaviour produced by those third parties.
            </p>

            <p className="mt-3">
              <strong>10.7 Your operational responsibility.</strong> You are solely responsible
              for: (a) selecting which primitives to install or invoke; (b) configuring and
              monitoring your agents; (c) human review of high-impact actions; (d) backups,
              audit logs and rollback; (e) compliance with all laws applicable to you and your
              users (including data-protection, sectoral and consumer-protection laws); and
              (f) obtaining the consents, licences and authorisations required to use any
              output.
            </p>
          </Section>

          <Section title="11. Indemnity">
            <p>
              You agree to defend, indemnify and hold harmless {SELLER}, its affiliates,
              officers, employees, contributors and contractors from and against any and all
              claims, demands, proceedings, losses, damages, fines, penalties, costs and
              expenses (including reasonable legal fees) arising out of or related to: (i)
              content, primitives, prompts or data you submit, publish, install or run; (ii)
              your use of, or reliance on, any output produced by an agent using a primitive
              obtained through the Service; (iii) any failure, bypass or misconfiguration of a
              guardrail in your environment; (iv) any professional, judicial, regulatory or
              compliance outcome affecting you or a third party; (v) your unlawful or
              unauthorised use of the Service; or (vi) your breach of these Terms or of any
              third-party right.
            </p>
          </Section>

          <Section title="12. Changes to the Terms">
            <p>
              We may update these Terms from time to time. Material changes will be announced
              on the Service. Continued use after the effective date of the change constitutes
              acceptance.
            </p>
          </Section>

          <Section title="13. Governing law and disputes">
            <p>
              These Terms are governed by the laws of the jurisdiction where {SELLER} is
              registered, without regard to conflict-of-law rules. The courts of that
              jurisdiction shall have exclusive jurisdiction over disputes, save where
              mandatory consumer-protection law grants you the right to bring proceedings in
              your country of residence.
            </p>
          </Section>

          <Section title="14. Miscellaneous">
            <p>
              You may not assign these Terms without our prior written consent; we may assign
              them in connection with a merger, acquisition or sale of assets. If a provision
              is held unenforceable, the remainder will continue in effect. Neither party is
              liable for delays caused by events beyond reasonable control (force majeure).
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these Terms? Contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
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
