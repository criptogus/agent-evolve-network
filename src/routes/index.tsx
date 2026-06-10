import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { Hero } from "@/components/site/home/Hero";
import { HowItWorks } from "@/components/site/home/HowItWorks";
import { Proof } from "@/components/site/home/Proof";
import { IndustryDemo } from "@/components/site/home/IndustryDemo";
import { CoreConcepts } from "@/components/site/home/CoreConcepts";
import { PlansTeaser } from "@/components/site/home/PlansTeaser";
import { Faq } from "@/components/site/home/Faq";
import { CtaSection } from "@/components/site/home/CtaSection";
import { SKILLS_LABEL } from "@/lib/site-stats";

const DESCRIPTION = `Paste one link and your AI agent gains ${SKILLS_LABEL} expert skills — every one signed, tested against jailbreaks, and scored in public. Works with Claude, Cursor and ChatGPT. No code, no fine-tuning.`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super Agent Skill — Expert skills for AI agents, signed and tested" },
      { name: "description", content: DESCRIPTION },
      {
        property: "og:title",
        content: "Expert skills for AI agents — signed, tested, installed in 30 seconds",
      },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://superagentskill.com/" },
      {
        name: "twitter:title",
        content: "Expert skills for AI agents — signed, tested, installed in 30s",
      },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/" }],
  }),
  component: Home,
});

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Super Agent Skill",
  url: "https://superagentskill.com",
  logo: "https://superagentskill.com/favicon.ico",
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
        text: "MCP (Model Context Protocol) lets your agent talk to external tools. You point your agent at Super Agent Skill once and it shows up as a connected tool. Every command flows through it — installs, generations and hot-swaps happen at runtime, no restart.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to retrain my agent or change my code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Packages install through MCP at runtime — zero retraining, zero downtime, zero code changes. Every install is reversible and audited.",
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
  ],
};

/**
 * One narrative, seven sections:
 * hook (Hero) → ease (HowItWorks) → differentiation (Proof) →
 * show-don't-tell (IndustryDemo) → vocabulary (CoreConcepts) →
 * monetization (PlansTeaser) → objections + close (Faq, CtaSection).
 */
function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <JsonLd data={[ORG_LD, SOFTWARE_LD, FAQ_LD]} />
      <Nav />
      <Hero />
      <HowItWorks />
      <Proof />
      <IndustryDemo />
      <CoreConcepts />
      <PlansTeaser />
      <Faq />
      <CtaSection />
      <Footer />
    </div>
  );
}
