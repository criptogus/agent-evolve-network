import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { inspectContent } from "../security/prompt-injection-guard.ts";

export const AuthoredDocument = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  name: z.string().min(2).max(120),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(20).max(280),
  long_description: z.string().min(80).max(4000),
  system_prompt: z.string().min(120).max(100000),
  rules: z.object({
    must: z.array(z.string().max(2000)).max(100),
    must_not: z.array(z.string().max(2000)).max(100),
  }),
  examples: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        input: z.string().min(1).max(10000),
        expected_output: z.string().min(1).max(10000),
      }),
    )
    .min(2)
    .max(8),
  license: z.string().min(1).max(100),
  authors: z.array(z.string().min(1).max(120)).min(1).max(20),
  compatibility: z
    .array(
      z.object({
        runtime: z.string().min(1).max(100),
        status: z.enum(["supported", "partial", "unsupported"]),
      }),
    )
    .max(30)
    .default([]),
  scopes: z.array(z.string().max(100)).max(30).default(["registry:read"]),
});
export type AuthoredPackage = z.infer<typeof AuthoredDocument>;
export function parseAuthoredDocument(source: string): AuthoredPackage {
  if (Buffer.byteLength(source, "utf8") > 200000) throw new Error("Document exceeds 200KB");
  const doc = AuthoredDocument.parse(parseYaml(source, { maxAliasCount: 0 }));
  const scan = inspectContent(
    [doc.system_prompt, ...doc.rules.must, ...doc.rules.must_not].join("\n"),
    { fence: false, rejectAtOrAbove: "high" },
  );
  if (scan.rejected) throw new Error("Instructions failed the prompt-injection preflight");
  return doc;
}
