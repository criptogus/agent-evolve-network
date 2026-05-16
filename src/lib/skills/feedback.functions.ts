/**
 * Feedback after enrichment of any package (skill / playbook / soul / guardrail).
 *
 * After an enrichment-style action (author, autocreate, forge loop, autolearn,
 * evaluation, review) the server creates a `package_feedback_request` row and
 * returns its id + a short prompt. The caller is then expected to ask either:
 *   - the human user (UI → submitPackageFeedback server fn), OR
 *   - the LLM that drove the action (MCP → submit_feedback tool)
 * to send a 1-5 rating + optional comment.
 *
 * Requests are single-use, expire after 30 days, and validated server-side by
 * the `submit_package_feedback` SQL function (see migration).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EnrichmentKind =
  | "author"
  | "autocreate"
  | "forge_loop"
  | "review_skill"
  | "upload"
  | "request_primitive"
  | "autolearn"
  | "evaluate";

export type FeedbackRequest = {
  id: string;
  kind: EnrichmentKind;
  package_id: string | null;
  prompt: string;
  expires_at: string;
  submit: {
    ui: { endpoint: string };
    mcp: { tool: "submit_feedback"; example: Record<string, unknown> };
  };
};

const PROMPTS: Record<EnrichmentKind, string> = {
  author: "How did this newly authored package turn out? Rate 1-5 and add a comment.",
  autocreate: "We auto-created this package on demand. Was it usable? Rate 1-5 and add a comment.",
  forge_loop: "The forge loop just evolved this package. Did the patch help? Rate 1-5 and add a comment.",
  autolearn: "The auto-learner proposed/applied a patch. Was it the right call? Rate 1-5.",
  evaluate: "We just evaluated this package. Did the report match your experience? Rate 1-5.",
  review_skill: "You just got a review of a local skill/playbook. Was the verdict accurate? Rate 1-5.",
  upload: "We normalised your uploaded primitive(s). Did the result preserve intent? Rate 1-5.",
  request_primitive: "Your request was queued. Was the brief captured correctly? Rate 1-5.",
};

/** Create a feedback request row. Pass the admin/server supabase client. */
export async function createFeedbackRequest(
  supabase: any,
  args: {
    kind: EnrichmentKind;
    packageId: string | null;
    versionId?: string | null;
    sourceUserId?: string | null;
    source?: "ui" | "mcp" | "cli" | "api";
    context?: Record<string, unknown>;
  },
): Promise<FeedbackRequest | null> {
  const { data, error } = await supabase
    .from("package_feedback_requests")
    .insert({
      kind: args.kind,
      package_id: args.packageId,
      version_id: args.versionId ?? null,
      source_user_id: args.sourceUserId ?? null,
      source: args.source ?? "ui",
      context: args.context ?? {},
    })
    .select("id, kind, package_id, expires_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    kind: data.kind,
    package_id: data.package_id,
    prompt: PROMPTS[data.kind as EnrichmentKind] ?? "Share your feedback (1-5).",
    expires_at: data.expires_at,
    submit: {
      ui: { endpoint: "/api/feedback (submitPackageFeedback server fn)" },
      mcp: {
        tool: "submit_feedback",
        example: {
          request_id: data.id,
          rating: 4,
          sentiment: "positive",
          comments: "Worked well; could use more examples.",
        },
      },
    },
  };
}

/* ----------------------------- Server fn (UI) ----------------------------- */

const SubmitInput = z.object({
  request_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  comments: z.string().max(4000).optional(),
  agent_model: z.string().max(120).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const submitPackageFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: id, error } = await supabase.rpc("submit_package_feedback", {
      _request_id: data.request_id,
      _rating: data.rating ?? null,
      _sentiment: data.sentiment ?? null,
      _comments: data.comments ?? null,
      _source: "ui",
      _agent_model: data.agent_model ?? null,
      _context: data.context ?? {},
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const, id };
  });
