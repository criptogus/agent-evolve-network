import { z } from "zod";

export const packageTypeEnum = z.enum(["skill", "playbook", "soul", "guardrail"]);

export const PackageDraftSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "lowercase, hyphens, numbers"),
  name: z.string().min(2).max(120),
  type: packageTypeEnum,
  description: z.string().min(20).max(280),
  long_description: z.string().min(80).max(4000),
  system_prompt: z.string().min(120),
  rules: z.object({
    input_schema: z.record(z.string(), z.any()).default({}),
    output_schema: z.record(z.string(), z.any()).default({}),
    must: z.array(z.string()).default([]),
    must_not: z.array(z.string()).default([]),
  }),
  examples: z.array(z.object({
    title: z.string(),
    input: z.string(),
    expected_output: z.string(),
    rationale: z.string().optional(),
  })).min(2).max(8),
  compatibility: z.array(z.object({
    runtime: z.string(),
    status: z.enum(["supported", "partial", "unsupported"]),
    detail: z.string().optional(),
  })).default([]),
  scopes: z.array(z.string()).default(["agent:upgrade", "registry:read"]),
});

export type PackageDraft = z.infer<typeof PackageDraftSchema>;

export const EvaluationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  precision: z.number().min(0).max(100),
  health: z.number().min(0).max(100),
  hallucination_rate: z.number().min(0).max(100),
  safety: z.number().min(0).max(100),
  example_results: z.array(z.object({
    title: z.string(),
    pass: z.boolean(),
    actual_output: z.string(),
    score: z.number().min(0).max(100),
    rationale: z.string(),
  })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvement_actions: z.array(z.string()),
  verdict: z.enum(["ship", "iterate", "reject"]),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

export const PatchSchema = z.object({
  rationale: z.string(),
  changelog: z.array(z.string()),
  patched_system_prompt: z.string().min(120),
  patched_rules: z.object({
    input_schema: z.record(z.string(), z.any()).optional(),
    output_schema: z.record(z.string(), z.any()).optional(),
    must: z.array(z.string()).optional(),
    must_not: z.array(z.string()).optional(),
  }),
  new_examples: z.array(z.object({
    title: z.string(),
    input: z.string(),
    expected_output: z.string(),
  })).default([]),
  next_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  confidence: z.number().min(0).max(100),
});

export type Patch = z.infer<typeof PatchSchema>;
