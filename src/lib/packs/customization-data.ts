import { z } from "zod";
export const CustomizedItemsSchema = z.array(
  z.object({
    package_id: z.string(),
    slug: z.string(),
    name: z.string(),
    type: z.string(),
    role: z.string(),
    customized_system_prompt: z.string(),
    customization_notes: z.string(),
    preserved_rules: z.array(z.string()),
    added_rules: z.array(z.string()),
  }),
);
export const ResearchSourcesSchema = z.array(z.object({ title: z.string(), ref: z.string() }));
