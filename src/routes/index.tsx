import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { PRICING_SENTENCE } from "@/lib/pricing-copy";
import { Hero } from "@/components/site/home/Hero";
import { Problem } from "@/components/site/home/Problem";
import { LabSteps } from "@/components/site/home/LabSteps";
import { OpenSkills } from "@/components/site/home/OpenSkills";
import { FounderLetter } from "@/components/site/home/FounderLetter";
import { University } from "@/components/site/home/University";
import { AgentFactory } from "@/components/site/home/AgentFactory";
import { SecurityPromise } from "@/components/site/home/SecurityPromise";
import { PlansTeaser } from "@/components/site/home/PlansTeaser";
import { Faq } from "@/components/site/home/Faq";
import { CtaSection } from "@/components/site/home/CtaSection";
import { SKILLS_LABEL } from "@/lib/site-stats";
import { getLiveSiteStats } from "@/lib/site-stats.functions";
import { canonicalLink } from "@/lib/seo/canonical";

// Kept under 60 chars so Google renders the full title.
const TITLE = "AI Agent Skills Marketplace — Super Agent Skill";

// Static branded share card in public/ — bump the filename when artwork changes.
const OG_IMAGE = "https://superagentskill.com/og-2026-07-31.jpg";


// Kept between 50 and 160 chars.
function buildDescription(skillsLabel: string) {
  return `${skillsLabel} graded agent skills — tested against jailbreaks, scored in public. Install with the open skills CLI (skills.sh), our CLI or MCP.`;
}

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { stay?: 1 } =>
    s["stay"] === 1 || s["stay"] === "1" ? { stay: 1 } : {},

  loader: async () => {
    // Live registry counts with a static fallback — never throws.
    const stats = await getLiveSiteStats().catch(() => null);
    return { stats };
  },
  head: ({ loaderData }) => {
    const skillsLabel = loaderData?.stats?.live ? `${loaderData.stats.skills}+` : SKILLS_LABEL;
    const description = buildDescription(skillsLabel);
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: description },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: description },
        { property: "og:url", content: "https://superagentskill.com/" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:secure_url", content: OG_IMAGE },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:image", content: OG_IMAGE },
        {
          name: "twitter:title",
          content: "Claude & AI agent skills — signed, tested, installed in 30s",
        },
        { name: "twitter:description", content: description },
      ],
      links: [canonicalLink("/")],
    };
  },
  component: Home,
});

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Super Agent Skill",
  url: "https://superagentskill.com",
  logo: "https://superagentskill.com/favicon.svg",
  sameAs: ["https://github.com/criptogus/agent-evolve-network"],
};

const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Super Agent Skill",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (MCP-compatible)",
  description:
    "Signed, adversarially-tested registry of skills, playbooks, souls and guardrails for AI agents. Every package ships with a verifiable Trust Score so teams can ship AI to customers safely.",
  url: "https://superagentskill.com",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

// Keep in sync with the visible FAQ in src/components/site/home/Faq.tsx.
const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What exactly is a skill?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A file that teaches an agent to do one job well — instructions, examples, an output contract and guardrails. Not a prompt. Alongside skills we ship playbooks (multi-step workflows), souls (drop-in expert personas) and guardrails (what the agent must never do).",
      },
    },
    {
      "@type": "Question",
      name: "How is a skill tested?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Format and substance are scored separately. Format is deterministic: structure, output contract, token budget, truncation. Substance is judged against the job the skill claims to do, with the exact excerpts that justify the score. Every skill also runs through a fixed adversarial harness — jailbreaks, role-play, data-exfiltration probes — and the block rate is recorded. The combined result is the Trust Score.",
      },
    },
    {
      "@type": "Question",
      name: "Do I have to write the evaluation cases myself?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The lab derives them from your description or from the skill you upload, then runs the same set on every version so scores are comparable. The cases and the rationale are included in your report.",
      },
    },
    {
      "@type": "Question",
      name: "Can I bring a skill I already use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Upload it and you get a graded report with the exact failures and a repaired draft. Your source is evaluated in isolation, never used to train shared models, and never shown to other users.",
      },
    },
    {
      "@type": "Question",
      name: "Which agents and models does it work with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Anything that speaks MCP: Claude, Hermes, ChatGPT, Codex, Cursor, Cline, Continue and custom agents. Paste one URL. Some clients need it in a config file plus one restart the first time; after that nothing changes.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to retrain my agent or change my code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No retraining and no code changes. Capabilities install at runtime through MCP, every install is reversible, and every install is logged.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: PRICING_SENTENCE,
      },
    },
    {
      "@type": "Question",
      name: "If I upload a proprietary skill, can Super Agent Skill copy it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You retain full ownership and control. Private packages stay scoped to your workspace, public listings only show what you choose to publish, and we sign a mutual NDA on request.",
      },
    },
  ],
};

/**
 * Narrative: hook (Hero) → the pain of untested capabilities (Problem) → the
 * lab as evidence in five numbered steps, including the A-grade delta
 * (LabSteps → GradeImpact) → what the lab produces at scale (AgentFactory,
 * University) → thesis, signed (FounderLetter) → IP objection
 * (SecurityPromise) → one price → objections → close. Technical depth lives
 * on /how-it-works so this page stays scannable.
 */
function Home() {
  const { user, loading } = useAuth();
  const { stay } = Route.useSearch();
  const navigate = useNavigate();

  // Signed-in users land on the command center instead of the sales page.
  // Crawlers and signed-out visitors always get the full landing page, and
  // `?stay=1` is the explicit escape hatch back to it.
  useEffect(() => {
    if (!loading && user && !stay) navigate({ to: "/home", replace: true });
  }, [loading, user, stay, navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <JsonLd data={[ORG_LD, SOFTWARE_LD, FAQ_LD]} />
      <Nav />
      <Hero />
      <Problem />
      <LabSteps />
      <OpenSkills />

      <AgentFactory />
      <University />
      <FounderLetter />
      <SecurityPromise />
      <PlansTeaser />
      <Faq />
      <CtaSection />
      <Footer />
    </div>
  );
}


