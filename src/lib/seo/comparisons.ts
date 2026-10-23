// Curated editorial comparison pages for /compare/<slug>.
// These own high-intent "X vs Y" queries. Each entry renders a full SSR page
// with keyword title, meta description, FAQPage JSON-LD, and marketplace CTAs.
//
// All claims here are grounded in the product: Ed25519 signing, adversarial
// testing with attacker/judge LLMs, the public Trust Score formula
// (adversarial 45%, real-world success 20%, signing 10%, age 15%, schema 10%),
// SkillForge re-testing, offline verification (npm run trust:verify),
// MCP one-URL install, and the npx CLI. No invented numbers or customers.

export interface ComparisonSection {
  heading: string;
  paragraphs: string[];
}

export interface ComparisonFaq {
  question: string;
  answer: string;
}

export interface Comparison {
  slug: string; // URL: /compare/<slug>
  title: string; // H1 + <title> keyword phrase
  metaDescription: string;
  lede: string;
  sections: ComparisonSection[];
  faqs: ComparisonFaq[];
  verdict: string;
}

const TRUST_FORMULA =
  "The Trust Score is a public, reproducible formula: adversarial test results count for 45%, real-world success telemetry for 20%, signing status for 10%, package age for 15%, and schema validity for 10%. Nothing is editorially assigned, and anyone can recompute a score offline with npm run trust:verify.";

export const COMPARISONS: Comparison[] = [
  {
    slug: "super-agent-skill-vs-github-prompt-repos",
    title: "Super Agent Skill vs raw GitHub prompt repos",
    metaDescription:
      "Should you copy prompts from GitHub repos or install verified skills? Compare raw prompt repos with Super Agent Skill's signed, adversarially tested marketplace.",
    lede:
      "GitHub is full of awesome-prompts repos with tens of thousands of stars. They are a great starting point for inspiration — and a risky foundation for production agents. Here is how a raw prompt repo compares to a verified skill marketplace, point by point.",
    sections: [
      {
        heading: "Provenance: stars vs signatures",
        paragraphs: [
          "A GitHub star tells you a repo was popular at some moment. It tells you nothing about who last edited the prompt you are about to paste into an agent with tool access. Repos change hands, maintainers accept drive-by PRs, and a prompt that was safe six months ago can be quietly modified — there is no mechanism that binds the text you copy to any identity or review event.",
          "Every skill on Super Agent Skill is signed with Ed25519. The signature binds the exact content to the author's key, so a modified skill fails verification instead of silently shipping. You can check signatures offline with npm run trust:verify — no need to trust our servers, or anyone's star count.",
        ],
      },
      {
        heading: "Testing: 'works on my machine' vs adversarial evaluation",
        paragraphs: [
          "Prompt repos are tested the way gists are tested: someone tried it once and it seemed to work. There is no harness that asks what happens when a hostile input hits the prompt — injection attempts, jailbreak framing, data-exfiltration bait buried in the context.",
          "Skills in the marketplace go through adversarial testing where an attacker LLM actively tries to break the skill and a judge LLM scores the outcomes. The adversarial pass rate is published on every listing, and it is the single largest input to the Trust Score at 45% of the formula. SkillForge re-runs these tests over time, so a skill that regresses gets caught rather than coasting on an old result.",
        ],
      },
      {
        heading: "Maintenance and install experience",
        paragraphs: [
          "Copy-pasting from a repo means you own drift forever: when the upstream prompt improves, your pasted copy does not. When it breaks against a new model version, nobody tells you.",
          "Skills install through MCP with a single URL, or via the npx CLI, and updates flow through the same channel with signatures verified on the way in. " + TRUST_FORMULA,
        ],
      },
    ],
    faqs: [
      {
        question: "Are GitHub prompt repos bad?",
        answer:
          "No — they are excellent for learning and prototyping. The problem is production use: no signing, no adversarial testing, no update channel, and no way to verify that the text you copied matches what the author intended.",
      },
      {
        question: "Can I bring a prompt from GitHub into Super Agent Skill?",
        answer:
          "Yes. Package it as a skill, sign it, and submit it. It will go through the same adversarial testing as everything else, and it earns a Trust Score from the public formula rather than from reputation.",
      },
      {
        question: "How do I verify a skill without trusting the marketplace?",
        answer:
          "Run npm run trust:verify locally. Ed25519 signature verification and Trust Score recomputation both work offline against the published formula.",
      },
    ],
    verdict:
      "Use prompt repos to explore ideas. When an agent gets tool access, credentials, or customer data, switch to skills that are signed, adversarially tested, and continuously re-verified.",
  },
  {
    slug: "super-agent-skill-vs-building-in-house",
    title: "Super Agent Skill vs building skills in-house",
    metaDescription:
      "Build agent skills in-house or install verified ones? Compare engineering cost, adversarial testing burden, and maintenance against Super Agent Skill's marketplace.",
    lede:
      "Your team can absolutely write its own agent skills — the question is whether writing the skill is the expensive part. In practice, the prompt is 20% of the work; the testing, hardening, and ongoing re-verification are the other 80%. Here is the honest build-vs-install breakdown.",
    sections: [
      {
        heading: "What 'building it in-house' actually includes",
        paragraphs: [
          "Writing a skill that works on the happy path takes an afternoon. Making it safe takes an evaluation harness: adversarial test cases, injection suites, a way to score outputs, and a schedule to re-run all of it every time the underlying model or the skill changes. Most teams that start with 'we'll just write the prompt ourselves' end up building a miniature testing platform on the side — or skipping the testing and hoping.",
          "There is also the provenance problem inside your own walls. Without signing, any engineer (or any compromised CI job) can edit the prompt an agent runs in production, and nothing flags it.",
        ],
      },
      {
        heading: "What the marketplace amortizes for you",
        paragraphs: [
          "Super Agent Skill runs adversarial testing with attacker and judge LLMs against every published skill, and SkillForge re-tests over time so results stay current instead of decaying. Skills are Ed25519-signed, so what you install is provably what the author published. " + TRUST_FORMULA,
          "Installation is one MCP URL or an npx command, which means evaluating three candidate skills costs minutes, not sprints. The build-vs-buy math shifts: in-house makes sense for skills encoding genuinely proprietary logic; for everything generic — code review, redaction, triage, compliance checks — you are rebuilding tested commodities.",
        ],
      },
      {
        heading: "The hybrid most teams land on",
        paragraphs: [
          "Install verified skills for commodity capabilities, and reserve in-house effort for the skills that encode your domain edge. You can also publish in-house skills to the marketplace privately or publicly and inherit the testing infrastructure — the adversarial harness and re-testing pipeline run the same either way, which is usually cheaper than maintaining your own.",
        ],
      },
    ],
    faqs: [
      {
        question: "When does building in-house clearly win?",
        answer:
          "When the skill encodes proprietary business logic, touches internal systems no marketplace skill knows about, or when policy requires all agent instructions to be authored internally. Even then, you still need adversarial testing — the threat model doesn't care who wrote the prompt.",
      },
      {
        question: "Can we run marketplace-grade testing on our own skills?",
        answer:
          "Yes — submit them through SkillForge and they go through the same attacker/judge LLM evaluation and periodic re-testing as public skills.",
      },
      {
        question: "How do we audit what we install?",
        answer:
          "Every skill's Trust Score decomposes into its published components (adversarial 45%, real success 20%, signing 10%, age 15%, schema 10%), and npm run trust:verify recomputes it offline. Your security team can verify without trusting us.",
      },
    ],
    verdict:
      "Build the skills that are your moat. Install the ones that aren't — and let the adversarial testing pipeline be someone else's infrastructure bill.",
  },
  {
    slug: "super-agent-skill-vs-untested-marketplace-prompts",
    title: "Super Agent Skill vs untested marketplace prompts",
    metaDescription:
      "Not all prompt marketplaces test what they sell. See how Super Agent Skill's adversarial testing, Ed25519 signing, and public Trust Score compare to untested prompt stores.",
    lede:
      "Prompt marketplaces have multiplied, but most are storefronts: listings, ratings, a buy button. Ratings measure whether buyers liked the output on a sunny day — not whether the prompt survives a hostile one. Here is what separates a tested skill registry from an untested prompt store.",
    sections: [
      {
        heading: "Ratings are not security reviews",
        paragraphs: [
          "A five-star prompt can still be trivially injectable. Reviews are written by users running friendly inputs; attackers do not leave reviews. Marketplaces that rank purely on popularity systematically overweight demo quality and underweight robustness, because robustness is invisible until it fails.",
          "Super Agent Skill publishes an adversarial pass rate for every skill, produced by an attacker LLM that actively attempts injection, exfiltration, and instruction-override attacks, scored by a judge LLM. That number is 45% of the Trust Score — the largest single component — precisely because it is the thing star ratings cannot see.",
        ],
      },
      {
        heading: "Tamper-evidence and re-testing",
        paragraphs: [
          "On an untested marketplace, the prompt you download today may differ from the one that earned its reviews, and nothing will tell you. Skills here are Ed25519-signed: content is cryptographically bound to the author, and any modification breaks verification. You can confirm this yourself, offline, with npm run trust:verify.",
          "Testing is also not a one-time stamp. SkillForge re-runs adversarial evaluations over time, so scores reflect current behavior against current models. " + TRUST_FORMULA,
        ],
      },
      {
        heading: "What this means for buyers",
        paragraphs: [
          "Instead of guessing from screenshots and testimonials, you compare skills on published, recomputable numbers: adversarial pass rate, real-world success telemetry, signing status, age, and schema validity. Install is a single MCP URL or an npx command, so trying the top two candidates side by side takes minutes.",
        ],
      },
    ],
    faqs: [
      {
        question: "What does 'adversarial testing' actually involve?",
        answer:
          "An attacker LLM generates hostile inputs — prompt injection, jailbreak framing, data-exfiltration attempts — against the skill, and a judge LLM scores whether the skill held its constraints. The pass rate is published on the listing.",
      },
      {
        question: "Can a skill's score go down after publication?",
        answer:
          "Yes. SkillForge re-tests skills over time, and the Trust Score reflects the latest results rather than the launch-day snapshot.",
      },
      {
        question: "Why should I trust the Trust Score?",
        answer:
          "You don't have to take it on faith. The formula is public (adversarial 45%, real success 20%, signing 10%, age 15%, schema 10%) and npm run trust:verify recomputes it offline from the underlying data.",
      },
    ],
    verdict:
      "If a marketplace can't show you an adversarial pass rate and a signature, it is selling text files with a checkout flow. Demand testing you can verify.",
  },
  {
    slug: "signed-skills-vs-unsigned-prompts",
    title: "Signed skills vs unsigned prompts: why it matters",
    metaDescription:
      "Unsigned prompts are unauditable inputs to systems with real permissions. Learn how Ed25519-signed skills give agents tamper-evident, offline-verifiable instructions.",
    lede:
      "Agents execute instructions with real permissions — repos, databases, payment APIs. An unsigned prompt is an unauthenticated instruction stream into that permission set. Code signing solved this problem for software distribution decades ago; skills are simply catching up.",
    sections: [
      {
        heading: "The threat model for unsigned prompts",
        paragraphs: [
          "If a prompt lives in a wiki page, a shared doc, or an unsigned marketplace download, then anyone with write access to that surface can change what your agent does. The change is invisible: prompts are prose, diffs don't get security review, and the agent will cheerfully follow the new instructions. Supply-chain attacks on prompts don't need to break your infrastructure — they only need to edit a text file upstream of it.",
        ],
      },
      {
        heading: "What Ed25519 signing gives you",
        paragraphs: [
          "Every skill on Super Agent Skill is signed with Ed25519. The signature cryptographically binds the exact skill content to the author's key: if a single character changes, verification fails. That converts 'we assume nobody touched it' into 'we can prove nobody touched it.'",
          "Verification is offline and independent: npm run trust:verify checks signatures and recomputes Trust Scores on your own machine, so your security posture never depends on trusting the marketplace's word. Signing status is also a component of the public Trust Score itself — 10% of the formula, alongside adversarial testing at 45%, real-world success at 20%, age at 15%, and schema validity at 10%.",
        ],
      },
      {
        heading: "Signing plus testing, not signing instead of testing",
        paragraphs: [
          "A signature proves who wrote a skill and that it hasn't changed — it does not prove the skill is safe. That is why signing is combined with adversarial testing by attacker and judge LLMs, and why SkillForge re-tests skills as models evolve. Signing gives you integrity and provenance; adversarial evaluation gives you robustness. Production agents need both.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is Ed25519 and why use it for skills?",
        answer:
          "Ed25519 is a modern, widely audited elliptic-curve signature scheme — fast to verify, small keys and signatures, and standard in software supply-chain security. It makes each skill tamper-evident and attributable to its author's key.",
      },
      {
        question: "Does a valid signature mean a skill is safe?",
        answer:
          "No. It means the content is exactly what the author published. Safety comes from the adversarial testing layer, which is why the Trust Score weights adversarial results at 45% and signing at 10%.",
      },
      {
        question: "Can I verify signatures without an internet connection?",
        answer:
          "Yes — npm run trust:verify performs signature verification and Trust Score recomputation offline.",
      },
    ],
    verdict:
      "You wouldn't run unsigned binaries in production. Prompts that drive agents with real permissions deserve the same bar — signed, verifiable, and tested.",
  },
  {
    slug: "mcp-skills-vs-fine-tuning",
    title: "MCP skills vs fine-tuning: which should you use?",
    metaDescription:
      "Fine-tuning bakes behavior into weights; MCP skills deliver it as installable, signed, testable instructions. Compare cost, iteration speed, auditability, and portability.",
    lede:
      "Both fine-tuning and skills change how a model behaves. Fine-tuning does it by adjusting weights; a skill does it by supplying structured, installable instructions at runtime through MCP. The difference determines your iteration speed, your audit story, and your bill.",
    sections: [
      {
        heading: "Iteration speed and cost",
        paragraphs: [
          "A fine-tune is a training job: assemble a dataset, train, evaluate, deploy, and repeat the whole loop for every change. When the base model updates, you retrain. A skill is a document: editing it, testing it, and shipping it happens in minutes, and installing one is a single MCP URL or an npx command.",
          "For behavior that changes frequently — policies, workflows, tool-use patterns, domain checklists — the retraining loop is a tax on every iteration. Fine-tuning earns its cost when you need to shift the model's fundamental style or capabilities at a level instructions cannot reach, at high volume where per-request instruction tokens matter.",
        ],
      },
      {
        heading: "Auditability and portability",
        paragraphs: [
          "A fine-tuned model is opaque: you cannot diff two checkpoints and see what behavioral change shipped, and you cannot cryptographically attribute a behavior to an author. A skill is inspectable text with an Ed25519 signature binding it to its author — reviewable in a pull request, verifiable offline with npm run trust:verify.",
          "Skills are also portable across the MCP ecosystem and across model upgrades. A fine-tune is welded to one base model; when the base improves, your investment depreciates. Skills ride the improvement for free, and SkillForge re-tests them against current models so you know they still hold.",
        ],
      },
      {
        heading: "Safety evaluation",
        paragraphs: [
          "Evaluating a fine-tune's safety means building your own red-team harness. Skills on Super Agent Skill arrive with adversarial testing already run — attacker LLM, judge LLM, published pass rate — and a Trust Score from a public formula (adversarial 45%, real success 20%, signing 10%, age 15%, schema 10%). That evaluation layer exists before you install, not after you deploy.",
        ],
      },
    ],
    faqs: [
      {
        question: "When is fine-tuning the right call?",
        answer:
          "When you need behavior that instructions can't reliably produce — deep style transfer, narrow-domain generation at very high volume, or latency/token budgets that rule out instruction overhead. For encoding procedures, policies, and tool workflows, skills are faster and cheaper to iterate.",
      },
      {
        question: "Can skills and fine-tuning be combined?",
        answer:
          "Yes. A common pattern is a lightly tuned (or stock) base model plus installable skills for task-specific behavior, keeping the auditable, fast-iterating layer in skills.",
      },
      {
        question: "Do skills survive model upgrades?",
        answer:
          "Skills are model-independent instructions, and SkillForge re-tests them over time, so regressions against new models are detected rather than assumed away. A fine-tune must be redone per base model.",
      },
    ],
    verdict:
      "Fine-tune to change what a model is. Install skills to change what it does — with signatures, adversarial test results, and an offline-verifiable Trust Score attached.",
  },
  {
    slug: "mcp-skills-vs-rag",
    title: "MCP skills vs RAG for domain expertise",
    metaDescription:
      "RAG retrieves knowledge; MCP skills encode procedure. Learn when to use retrieval, when to install a tested skill, and how the two combine for domain-expert agents.",
    lede:
      "RAG and skills both make an agent 'know' your domain, but they carry different cargo. RAG delivers facts at query time; a skill delivers procedure — how to reason, what to check, which tools to call, what to refuse. Most production agents need both, in different places.",
    sections: [
      {
        heading: "Knowledge vs procedure",
        paragraphs: [
          "RAG excels when the answer lives in a corpus: product docs, tickets, contracts, research. Its failure mode is procedural — retrieval can hand a model the right document and still get a wrong process, because 'how to conduct a compliance review' is not a paragraph to retrieve, it's a discipline to follow.",
          "A skill encodes that discipline directly: steps, constraints, output schemas, tool-use order, refusal conditions. It behaves the same on every run instead of depending on which chunks the retriever surfaced today.",
        ],
      },
      {
        heading: "Testability and trust",
        paragraphs: [
          "A RAG pipeline's quality shifts with its index, embeddings, and chunking; evaluating it is a bespoke project, and it carries its own injection risk — retrieved documents can contain hostile instructions. Skills on Super Agent Skill are adversarially tested against exactly that class of attack by attacker and judge LLMs, with the pass rate published, and re-tested over time via SkillForge.",
          "Each skill is Ed25519-signed and scored by the public Trust Score formula (adversarial 45%, real success 20%, signing 10%, age 15%, schema 10%), verifiable offline with npm run trust:verify. Your retrieval corpus has no equivalent tamper-evidence unless you build it.",
        ],
      },
      {
        heading: "Using them together",
        paragraphs: [
          "The strongest pattern: a signed, tested skill defines the procedure and safety rails, and RAG supplies the facts the procedure operates on. The skill tells the agent how to treat retrieved content — including how not to obey instructions found inside it. Install is one MCP URL, so adding the procedural layer to an existing RAG stack is an afternoon, not a migration.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does a skill replace my vector database?",
        answer:
          "No. Skills encode procedure and constraints; RAG serves fresh, large-scale knowledge. Replace RAG only if your 'knowledge' was actually procedure all along — checklists, policies, workflows — which fits naturally in a skill.",
      },
      {
        question: "Can skills reduce prompt-injection risk from retrieved documents?",
        answer:
          "That is one of the main things adversarial testing measures: an attacker LLM plants hostile instructions and a judge LLM scores whether the skill's constraints held. The pass rate is on the listing.",
      },
      {
        question: "How do I add a skill to an existing RAG agent?",
        answer:
          "Connect via MCP with a single URL or install with the npx CLI. The skill layers on top of your existing retrieval pipeline.",
      },
    ],
    verdict:
      "Use RAG for what the agent should know, and signed, adversarially tested skills for how it should act. Domain expertise is both.",
  },
  {
    slug: "super-agent-skill-vs-langchain-hub",
    title: "Super Agent Skill vs LangChain Hub prompts",
    metaDescription:
      "LangChain Hub shares prompts for LangChain apps; Super Agent Skill ships signed, adversarially tested skills over MCP. Compare trust, testing, and portability.",
    lede:
      "LangChain Hub is a genuinely useful sharing layer for prompts inside the LangChain ecosystem. But sharing and trusting are different problems. If your agent framework question is 'where do I find a prompt,' the Hub answers it; if it's 'what can I safely run in production,' the answer needs signatures and adversarial evidence.",
    sections: [
      {
        heading: "Distribution vs verification",
        paragraphs: [
          "The Hub distributes community prompts with versioning and easy pulls into LangChain code. What it does not provide is cryptographic provenance or hostile testing: a pulled prompt is trusted on reputation, and its behavior under attack is unknown until your users find out.",
          "Super Agent Skill treats verification as the product. Skills are Ed25519-signed, adversarially tested by attacker and judge LLMs with published pass rates, re-tested over time through SkillForge, and ranked by a Trust Score whose formula is public: adversarial 45%, real-world success 20%, signing 10%, age 15%, schema 10%. All of it is recomputable offline with npm run trust:verify.",
        ],
      },
      {
        heading: "Ecosystem lock-in vs MCP",
        paragraphs: [
          "Hub prompts are pulled into LangChain applications; that's their home. Skills install over MCP — an open protocol supported across agent runtimes — with a single URL, or via the npx CLI. The same signed skill serves whichever framework your team runs this quarter, which matters in a stack that changes as fast as agents do.",
        ],
      },
      {
        heading: "Where the Hub still fits",
        paragraphs: [
          "For rapid prototyping inside a LangChain codebase, pulling a Hub prompt is frictionless and fine. The transition point is the same as with any unsigned prompt source: the moment the agent touches credentials, customer data, or write-capable tools, provenance and adversarial evidence stop being optional.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I use Super Agent Skill with a LangChain app?",
        answer:
          "Yes — LangChain supports MCP, so skills install with one URL alongside your existing chains and tools.",
      },
      {
        question: "What's the practical difference for security review?",
        answer:
          "A Hub prompt arrives as trusted text; your team must red-team it themselves. A marketplace skill arrives with a published adversarial pass rate, an Ed25519 signature, and a Trust Score you can recompute offline.",
      },
    ],
    verdict:
      "Prototype from the Hub if you live in LangChain. Ship to production from a registry that signs and adversarially tests what it distributes.",
  },
  {
    slug: "super-agent-skill-vs-custom-gpts",
    title: "Super Agent Skill vs custom GPTs",
    metaDescription:
      "Custom GPTs live inside ChatGPT; MCP skills are portable, Ed25519-signed, and adversarially tested. Compare distribution, trust, and production readiness.",
    lede:
      "Custom GPTs made packaging instructions mainstream: give a system prompt a name and a storefront listing. For consumer chat, that's plenty. For teams wiring agents into real systems, the packaging is the easy part — portability, provenance, and testing are where custom GPTs stop and skills begin.",
    sections: [
      {
        heading: "Walled garden vs open protocol",
        paragraphs: [
          "A custom GPT runs in one place: ChatGPT. Its instructions cannot follow you to another model, another runtime, or your own agent infrastructure. MCP skills install into any MCP-capable agent with a single URL or an npx command — the skill is an asset you own and move, not a configuration trapped in one vendor's UI.",
        ],
      },
      {
        heading: "Trust: store listing vs verifiable evidence",
        paragraphs: [
          "GPT store rankings run on usage and ratings — the same popularity signals that miss robustness entirely, and GPT instructions are famously extractable and modifiable by their owner at any time with no notice to users. There is no signature binding behavior to an author, and no published hostile-testing results.",
          "Skills on Super Agent Skill are Ed25519-signed and tamper-evident, adversarially tested by attacker and judge LLMs with pass rates on the listing, and re-tested by SkillForge as models change. " + TRUST_FORMULA,
        ],
      },
      {
        heading: "Production posture",
        paragraphs: [
          "Custom GPTs are a consumer distribution channel; they don't slot into CI, code review, or a security team's audit workflow. Skills are text artifacts your team can review in a PR, verify offline, and pin by signature — the properties infrastructure teams already expect from every other dependency they ship.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I convert a custom GPT into a skill?",
        answer:
          "The instructions port naturally: package them as a skill, sign it, and submit it for adversarial testing. You gain portability across MCP runtimes plus a published Trust Score.",
      },
      {
        question: "Do skills work with OpenAI models?",
        answer:
          "Skills are model-agnostic instructions delivered over MCP; any MCP-capable agent runtime can install them, regardless of the underlying model vendor.",
      },
      {
        question: "Why does tamper-evidence matter here?",
        answer:
          "A custom GPT's owner can silently change its instructions after you've adopted it. A signed skill cannot change without breaking Ed25519 verification, which you can check yourself with npm run trust:verify.",
      },
    ],
    verdict:
      "Custom GPTs are great storefronts for chat experiences. Agent infrastructure deserves dependencies that are portable, signed, and adversarially tested.",
  },
];

export function findComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
