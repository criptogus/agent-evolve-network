import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export type AdversarialVertical =
  | "security"
  | "fintech"
  | "healthcare"
  | "devops"
  | "general";

export type AdversarialCategory =
  | "prompt_injection"
  | "jailbreak"
  | "data_exfiltration"
  | "hallucination"
  | "policy_violation"
  | "instruction_drift"
  | "pii_leak"
  | "compliance_breach"
  | "harmful_action"
  | "tool_misuse";

export interface AdversarialExpectations {
  must_refuse_or_must_include: {
    must_refuse?: boolean;
    must_include?: string[];
    must_not_include?: string[];
    must_invoke_guardrail?: string[];
  };
  rationale?: string;
}

export interface AdversarialCase {
  id: string;
  type: "adversarial_case";
  vertical: AdversarialVertical;
  target: {
    package_type: "skill" | "playbook" | "soul" | "guardrail";
    package_slugs?: string[];
    tags?: string[];
  };
  category: AdversarialCategory;
  severity: "low" | "medium" | "high" | "critical";
  input: string;
  context?: string;
  expectations: AdversarialExpectations;
  references?: string[];
  tags?: string[];
  authors: string[];
  license?: string;
}

export interface LoadOptions {
  rootDir?: string;
  vertical?: AdversarialVertical;
  packageType?: AdversarialCase["target"]["package_type"];
  packageSlug?: string;
  tags?: string[];
}

const DEFAULT_ROOT = new URL("../../../content/adversarial/", import.meta.url).pathname;

export function loadAdversarialCases(opts: LoadOptions = {}): AdversarialCase[] {
  const root = opts.rootDir ?? DEFAULT_ROOT;
  const cases: AdversarialCase[] = [];
  let verticals: string[];
  try {
    verticals = readdirSync(root);
  } catch {
    return [];
  }
  for (const vertical of verticals) {
    if (opts.vertical && vertical !== opts.vertical) continue;
    const dir = join(root, vertical);
    let stats;
    try { stats = statSync(dir); } catch { continue; }
    if (!stats.isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
      const full = join(dir, entry);
      const parsed = parseYaml(readFileSync(full, "utf8")) as AdversarialCase;
      if (!parsed || parsed.type !== "adversarial_case") continue;

      if (opts.packageType && parsed.target.package_type !== opts.packageType) continue;
      if (opts.packageSlug) {
        const slugs = parsed.target.package_slugs ?? [];
        const tags = parsed.target.tags ?? [];
        const slugMatch = slugs.length === 0 || slugs.includes(opts.packageSlug);
        const tagMatch =
          !opts.tags || opts.tags.length === 0 || tags.some((t) => opts.tags!.includes(t));
        if (!slugMatch && !tagMatch) continue;
      }
      cases.push(parsed);
    }
  }
  return cases;
}
