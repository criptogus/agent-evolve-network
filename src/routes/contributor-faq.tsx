import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/contributor-faq")({
  head: () => ({
    meta: [
      { title: "Contributor FAQ — Improved skills, updates & redistribution | Super Agent Skill" },
      {
        name: "description",
        content:
          "How Super Agent Skill handles contributor submissions: IP assignment, AI-improved versions, attribution, updates and marketplace redistribution.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: ContributorFaqPage,
});

type Item = { q: string; a: React.ReactNode };

const ITEMS: Item[] = [
  {
    q: "What exactly happens when I submit a skill, playbook, soul or guardrail?",
    a: (
      <>
        Your submission enters our <span className="text-foreground">Forge Loop</span> —
        Drafter → Judge → Critic → Red Team. We may keep it as-is, rewrite it for clarity,
        merge it with related work, split it into smaller pieces, or use it as training
        signal for future skills. Per <Link to="/terms" hash="contributor-ip" className="text-primary hover:underline">§6.1</Link>,
        the resulting artefact (original or improved) is owned by Super Agent Skill, Inc.
      </>
    ),
  },
  {
    q: "What does \"improved version\" mean in practice?",
    a: (
      <>
        We treat the assignment as covering both the literal text you submitted and any
        derivative — translations, refactors, prompt-rewrites, evaluation suites, automated
        merges with other skills, and AI-generated upgrades. There is no separate
        license needed for derivatives; they ship under the same registry rules as the
        original.
      </>
    ),
  },
  {
    q: "Will my name still appear on the skill after it's improved?",
    a: (
      <>
        Public attribution is courtesy, not contractual. By default we keep you listed as
        original contributor on the skill detail page and in the version changelog when the
        edit is incremental. We may remove attribution if the skill is fundamentally
        rewritten, merged, deprecated, or if you ask us to. Attribution is never a license
        — removing your name does not return any rights to you.
      </>
    ),
  },
  {
    q: "Can I keep using the skill I submitted on my own projects?",
    a: (
      <>
        Yes. Section 6.1 grants you a perpetual, worldwide, royalty-free license to use the
        original text of your own contribution outside the platform. You cannot, however,
        republish improved versions we produce, nor block us from updating, sublicensing,
        or reselling the skill in the marketplace.
      </>
    ),
  },
  {
    q: "How do updates and redistribution work?",
    a: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Every accepted change is published as a new <span className="text-foreground">semver</span>{" "}
          version (e.g. 1.4.0 → 1.5.0). Older versions stay installable for reproducibility.
        </li>
        <li>
          Installed users see an <span className="text-foreground">Update available</span>{" "}
          badge. Updates are opt-in — we never silently mutate skills already running on
          someone's agent.
        </li>
        <li>
          We can redistribute any version through MCP, the marketplace, partner registries,
          bundles, or paid tiers. Revenue from paid distribution belongs to the platform.
        </li>
        <li>
          Skills can be deprecated, hidden, or removed at any time for safety, quality or
          legal reasons, without notice.
        </li>
      </ul>
    ),
  },
  {
    q: "What if my submission is rejected?",
    a: (
      <>
        Rejected submissions are not published, but the assignment in §6.1 still applies to
        whatever you uploaded. We may retain the content for moderation logs and to train
        our review models. We will not publish rejected work under your name without your
        consent.
      </>
    ),
  },
  {
    q: "Can I delete my contributions later?",
    a: (
      <>
        You can delete your account, which removes your profile and personal data per our{" "}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        Skills you contributed remain in the registry under the platform's ownership,
        because other users may have already installed and depend on them. We will, on
        request, drop your name from the public attribution.
      </>
    ),
  },
  {
    q: "What about skills that mix my work with other contributors' work?",
    a: (
      <>
        Improved or merged skills are treated as platform-owned compositions. Each original
        contributor's assignment under §6.1 covers their portion. The merged skill is
        published as a single platform-owned artefact, not as a co-owned work — there is no
        joint copyright, no veto rights, and no royalty pool.
      </>
    ),
  },
  {
    q: "Why this model?",
    a: (
      <>
        Agent skills evolve fast and get rewritten constantly. A clean assignment lets us
        ship safety fixes, evaluation upgrades and quality improvements without chasing
        per-contributor approvals every time. It also protects the platform — and other
        contributors — from disputes when an improved version no longer resembles the
        original submission.
      </>
    ),
  },
  {
    q: "Where is this written in the legal terms?",
    a: (
      <>
        The binding text lives in{" "}
        <Link to="/terms" hash="contributor-ip" className="text-primary hover:underline">
          Terms of Service §6.1 — Contributor IP Assignment
        </Link>
        . If anything on this FAQ conflicts with the Terms, the Terms win.
      </>
    ),
  },
];

function ContributorFaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Contributor FAQ
          </span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Improved skills, updates &amp; redistribution
          </h1>
          <p className="mt-4 text-muted-foreground">
            Plain-English answers to the questions contributors ask most. This page is
            informational; the binding language is in the{" "}
            <Link to="/terms" hash="contributor-ip" className="text-foreground underline-offset-2 hover:underline">
              Terms of Service §6.1
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-6">
          {ITEMS.map((item, i) => (
            <article
              key={i}
              className="rounded-lg border border-border bg-surface/40 p-5"
            >
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {i + 1}. {item.q}
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          Still unsure?{" "}
          <a
            href="mailto:legal@superagentskill.com"
            className="text-primary underline-offset-2 hover:underline"
          >
            Email legal@superagentskill.com
          </a>{" "}
          before submitting — we'd rather answer up front than fix it later.
        </div>
      </section>

      <Footer />
    </div>
  );
}
