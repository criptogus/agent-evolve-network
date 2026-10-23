import { z } from "zod";
export const TemplateDataSchema = z.object({
  subject: z.string().optional(),
  name: z.string().optional(),
  dashboardUrl: z.string().optional(),
  action: z.string().optional(),
  details: z.string().optional(),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  heading: z.string().optional(),
  preheader: z.string().optional(),
  intro: z.array(z.string()).optional(),
  metrics: z
    .array(z.object({ label: z.string(), value: z.string(), note: z.string().optional() }))
    .optional(),
  bullets: z.array(z.string()).optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  footnote: z.string().optional(),
  pixelUrl: z.string().optional(),
});
export type TemplateData = z.infer<typeof TemplateDataSchema>;
import type { ComponentType } from "react";
import { template as welcomeTemplate } from "./welcome";
import { template as actionConfirmationTemplate } from "./action-confirmation";
import { template as crmLifecycleTemplate } from "./crm-lifecycle";

export interface TemplateEntry {
  component: ComponentType<TemplateData>;
  subject: string | ((data: TemplateData) => string);
  displayName?: string;
  previewData?: TemplateData;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Add new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  "action-confirmation": actionConfirmationTemplate,
  "crm-lifecycle": crmLifecycleTemplate,
};
