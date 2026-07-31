import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { Hero } from "@/components/site/home/Hero";
import { AgentFactory } from "@/components/site/home/AgentFactory";
import { CompatibleAgents } from "@/components/site/home/CompatibleAgents";
import { HowItWorks } from "@/components/site/home/HowItWorks";
import { Proof } from "@/components/site/home/Proof";
import { SecurityPromise } from "@/components/site/home/SecurityPromise";
import { GradeImpact } from "@/components/site/home/GradeImpact";
import { IndustryDemo } from "@/components/site/home/IndustryDemo";
import { CoreConcepts } from "@/components/site/home/CoreConcepts";
import { PlansTeaser } from "@/components/site/home/PlansTeaser";
import { Faq } from "@/components/site/home/Faq";
import { CtaSection } from "@/components/site/home/CtaSection";
import { SKILLS_LABEL } from "@/lib/site-stats";
import { getLiveSiteStats } from "@/lib/site-stats.functions";
import { canonicalLink } from "@/lib/seo/canonical";

const TITLE =
  "Claude Skills & AI Agent Skills Marketplace — Signed & Tested | Super Agent Skill";

// Same OG image the root layout ships; public/ has no raster og.png yet.
const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31e8f1c8-d61a-43e0-a6cf-bc7dc826978f/id-preview-a810735d--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app-1778445620031.png";

function buildDescription(skillsLabel: string) {
  return `Marketplace of ${skillsLabel} MCP skills for Claude, Cursor and ChatGPT — every skill signed, adversarially tested against jailbreaks, and scored in public. Connect once via MCP; no code, no fine-tuning.`;
}

export const Route = createFileRoute("/")({
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
      name: "How does the MCP connection actually work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MCP (Model Context Protocol) lets your agent talk to external tools. You point your agent at Super Agent Skill once and it shows up as a connected tool. Every command flows through it — installs, generations and swaps happen at runtime. Some clients (Claude Desktop, Cursor) need the endpoint added to a config file and one restart; after that nothing else changes.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to retrain my agent or change my code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No retraining and no code changes in your agent. Packages install through MCP at runtime; some clients need the endpoint added to a config file and one restart the first time. Every install is reversible and audited.",
      },
    },
    {
      "@type": "Question",
      name: "Which agent runtimes are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Any MCP-compatible runtime: Claude, Cursor, ChatGPT, Continue, Cline and custom agents.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hacker is free forever. Agent Pass is $19 per agent per month with unlimited upgrades. Enterprise is custom with private registry, SSO and audit logs.",
      },
    },
    {
      "@type": "Question",
      name: "If I upload a proprietary skill, can Super Agent Skill copy it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You retain full ownership and control. Your source code is evaluated in an isolated sandbox, never used to train shared models, and never exposed to other users. Public listings only show metadata, Trust Score and signed release artifacts that you choose to publish. Private packages stay scoped to your workspace.",
      },
    },
  ],
};

/**
 * One narrative, seven sections, ordered as a conversion funnel:
 * hook (Hero) → ease (HowItWorks) → show-don't-tell (IndustryDemo, the
 * most persuasive section, before any technical deep-dive) →
 * differentiation/trust (Proof) → vocabulary (CoreConcepts) →
 * monetization (PlansTeaser) → objections + close (Faq, CtaSection).
 */
function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <JsonLd data={[ORG_LD, SOFTWARE_LD, FAQ_LD]} />
      <Nav />
      <Hero />
      {/* Corporate agent factory — the primary product story. */}
      <AgentFactory />
      {/* Primary sales argument — the tangible A-grade delta sits directly
          under the hook, before anything else. */}
      <GradeImpact />
      <CompatibleAgents />
      <HowItWorks />
      <IndustryDemo />
      <Proof />
      {/* IP / security objection — address the fear of uploading proprietary
          skills before the visitor reaches pricing or the FAQ. */}
      <SecurityPromise />
      <CoreConcepts />
      <PlansTeaser />
      <Faq />
      <CtaSection />
      <Footer />
    </div>
  );
}
