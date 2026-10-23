/**
 * Plain-language glossary for jargon that shows up in package names/descriptions.
 * Used to render short tooltips on skill cards so newcomers aren't lost.
 */
export type GlossaryTerm = {
  /** Short label shown on the card chip. */
  label: string;
  /** One-sentence plain-language explanation. */
  plain: string;
  /** Case-insensitive patterns that indicate the term is present. */
  match: RegExp;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    label: "Expo",
    plain: "Expo is a toolkit for building iOS/Android apps with React Native.",
    match: /\bexpo\b/i,
  },
  {
    label: "EAS",
    plain: "EAS (Expo Application Services) builds and ships those mobile apps to the app stores.",
    match: /\beas\b/i,
  },
  {
    label: "OAuth",
    plain: 'OAuth is the "Sign in with Google/GitHub" standard that lets apps use your account without your password.',
    match: /\boauth2?\b/i,
  },
  {
    label: "Auditor",
    plain: "An auditor skill reviews your code or config and reports problems instead of changing anything.",
    match: /\bauditor|\baudits?\b/i,
  },
  {
    label: "SAML / SSO",
    plain: "SAML and SSO are company login systems where one corporate account signs you into many tools.",
    match: /\bsaml\b|\bsso\b/i,
  },
  {
    label: "Kubernetes",
    plain: "Kubernetes runs and scales containerized apps across many servers.",
    match: /\bkubernetes\b|\bk8s\b/i,
  },
  {
    label: "Terraform",
    plain: "Terraform creates cloud infrastructure from code files instead of clicking in a console.",
    match: /\bterraform\b/i,
  },
  {
    label: "CI/CD",
    plain: "CI/CD is the automation that tests your code and releases it whenever you push changes.",
    match: /\bci\/cd\b|\bci cd\b|\bpipelines?\b/i,
  },
  {
    label: "RLS",
    plain: "RLS (row-level security) are database rules deciding which rows each user is allowed to read or write.",
    match: /\brls\b|row-level security/i,
  },
  {
    label: "MCP",
    plain: "MCP is the protocol that lets AI coding agents plug into external tools like this one.",
    match: /\bmcp\b/i,
  },
  {
    label: "Guardrail",
    plain: "A guardrail is a rule that blocks an agent from risky actions, like deleting data or leaking secrets.",
    match: /\bguardrails?\b/i,
  },
  {
    label: "Soul",
    plain: "A soul is an agent's persona: its tone, priorities and default behaviour.",
    match: /\bsouls?\b/i,
  },
  {
    label: "Playbook",
    plain: "A playbook is a step-by-step procedure an agent follows for a recurring task.",
    match: /\bplaybooks?\b/i,
  },
  {
    label: "Webhook",
    plain: "A webhook is an automatic message one app sends another when something happens.",
    match: /\bwebhooks?\b/i,
  },
  {
    label: "Solidity",
    plain: "Solidity is the programming language for Ethereum smart contracts.",
    match: /\bsolidity\b|smart contracts?/i,
  },
  {
    label: "GraphQL",
    plain: "GraphQL is an API style where the client asks for exactly the fields it needs.",
    match: /\bgraphql\b/i,
  },
  {
    label: "gRPC",
    plain: "gRPC is a fast binary protocol services use to call each other.",
    match: /\bgrpc\b/i,
  },
  {
    label: "Observability",
    plain: "Observability is the logs, metrics and traces you use to see what a running system is doing.",
    match: /\bobservability\b|\btelemetry\b|\bopentelemetry\b/i,
  },
];

/** Find glossary terms present in a package's text, most relevant first, capped. */
export function findGlossaryTerms(text: string, limit = 3): GlossaryTerm[] {
  const hay = text || "";
  const hits = GLOSSARY.filter((t) => t.match.test(hay));
  return hits.slice(0, limit);
}
