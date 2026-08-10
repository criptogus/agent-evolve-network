import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { HowItWorks } from "@/components/site/home/HowItWorks";
import { CompatibleAgents } from "@/components/site/home/CompatibleAgents";
import { OpenSkills } from "@/components/site/home/OpenSkills";
import { Proof } from "@/components/site/home/Proof";
import { CoreConcepts } from "@/components/site/home/CoreConcepts";
import { CtaSection } from "@/components/site/home/CtaSection";
import { canonicalLink } from "@/lib/seo/canonical";

const TITLE = "How it works — connect, install, keep it verified | Super Agent Skill";
const DESCRIPTION =
  "The mechanics behind Super Agent Skill: install tested skills with the open skills CLI (skills.sh), our CLI or MCP, and see how Trust Score, signatures and adversarial testing are produced.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://superagentskill.com/how-it-works" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [canonicalLink("/how-it-works")],
  }),
  component: HowItWorksPage,
});

/**
 * The depth that used to sit on the home page. Keeping it on its own route
 * shortens the landing narrative without losing the technical explanation
 * that security and platform buyers ask for.
 */
function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Nav />
      <main>
        <section className="border-b border-border px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Connect once. Install what is already tested.
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Your agent talks to us over MCP. Every skill, playbook, soul and agent you install has
              been through the same pipeline: adversarial testing, scoring, signing, and continuous
              re-testing after publication.
            </p>
          </div>
        </section>
        <HowItWorks />
        <CompatibleAgents />
        <Proof />
        <CoreConcepts />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
