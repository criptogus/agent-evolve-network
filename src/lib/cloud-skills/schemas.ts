import { z } from "zod";

export const CloudSkillSlug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "lowercase, hyphens, numbers; no leading/trailing hyphen");

export const TemplateVariable = z.object({
  type: z.enum(["string", "number", "boolean", "select"]).default("string"),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
});

export const CreateCloudSkillInput = z.object({
  slug: CloudSkillSlug,
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(60).default("general"),
  tags: z.array(z.string().max(40)).max(10).default([]),
  content: z.string().min(10).max(200_000),
  variables: z.record(z.string(), TemplateVariable).default({}),
  is_public: z.boolean().default(false),
});

export const UpdateCloudSkillInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(60).optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  content: z.string().min(10).max(200_000).optional(),
  variables: z.record(z.string(), TemplateVariable).optional(),
  is_public: z.boolean().optional(),
  changelog: z.string().max(500).optional(),
});

export const ListCloudSkillsInput = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
  include_public: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const ExportFormat = z.enum(["markdown", "json", "yaml"]);

export type CreateCloudSkillData = z.infer<typeof CreateCloudSkillInput>;
export type UpdateCloudSkillData = z.infer<typeof UpdateCloudSkillInput>;
export type ListCloudSkillsData = z.infer<typeof ListCloudSkillsInput>;
