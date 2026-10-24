import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MatchSchema, buildMatchPrompt, sanitizeMatch } from "./match-contract";
import {
  BENCHMARK_MODEL,
  BENCHMARK_OUTPUT_LIMIT,
  generatorCost,
  requireBenchmarkPreview,
  reserveGeneration,
} from "./benchmark-budget";
const candidate = z.object({
  slug: z.string().max(160),
  name: z.string().max(200),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  description: z.string().max(4000),
});
const input = z.object({
  attempt: z.string().regex(/^[a-z0-9:-]{1,100}$/),
  brief: z.string().min(20).max(4000),
  catalogSize: z.literal(665),
  candidates: z.array(candidate).min(1).max(665),
  desired: z.object({
    skills: z.literal(5),
    playbooks: z.literal(2),
    souls: z.literal(1),
    guardrails: z.literal(2),
  }),
  remaining: z.number().positive().max(5),
});
// Extra process-local protection; the browser's durable inflight journal is authoritative
// across reloads. Unknown attempts cannot be resumed or retried automatically.
const attempts = new Set<string>();
export const generateBenchmarkObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    requireBenchmarkPreview(getRequest().url);
    const role = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error || !role.data) throw new Response("Forbidden", { status: 403 });
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Managed Lovable AI is unavailable; no request started");
    if (attempts.has(data.attempt) || attempts.size >= 72)
      throw new Error("Attempt already started or finite batch exhausted");
    if (new Set(data.candidates.map((c) => c.slug)).size !== data.candidates.length)
      throw new Error("Duplicate catalog slugs");
    const { system, prompt } = buildMatchPrompt(data);
    const reservation = reserveGeneration(
      system,
      prompt,
      JSON.stringify(z.toJSONSchema(MatchSchema)),
      data.remaining,
    );
    attempts.add(data.attempt);
    const started = Date.now();
    let transportEvidence: string | null = null;
    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (url, init) => {
        const response = await fetch(url, init);
        if (response.ok) {
          const text = await response.clone().text();
          if (text.includes(key)) throw new Error("Rejected provider response");
          const parsed = z
            .object({
              id: z.string().optional(),
              model: z.string().optional(),
              usage: z.unknown().optional(),
              choices: z
                .array(
                  z.object({
                    finish_reason: z.string().nullable().optional(),
                    message: z.object({ content: z.string().nullable().optional() }),
                  }),
                )
                .optional(),
            })
            .safeParse(JSON.parse(text));
          if (parsed.success) transportEvidence = JSON.stringify(parsed.data);
        }
        return response;
      },
    });
    try {
      const result = await generateText({
        model: provider(BENCHMARK_MODEL),
        system,
        prompt,
        output: Output.object({ schema: MatchSchema }),
        maxOutputTokens: BENCHMARK_OUTPUT_LIMIT,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(180000),
      });
      const usage = result.usage;
      const inputTokens = usage.inputTokens,
        outputTokens = usage.outputTokens,
        cached = usage.inputTokenDetails.cacheReadTokens;
      // Retain a completed transport even if schema/finish/metering fails. No output repair.
      const parsed = MatchSchema.safeParse(JSON.parse(result.text));
      const cost =
        inputTokens !== undefined && outputTokens !== undefined && cached !== undefined
          ? generatorCost(inputTokens, cached, outputTokens)
          : null;
      return {
        attempt: data.attempt,
        status: "returned" as const,
        requestedModel: BENCHMARK_MODEL,
        actualModel: result.response.modelId,
        responseId: result.response.id,
        raw: result.text,
        transportEvidence,
        parsed: parsed.success ? parsed.data : null,
        clean: parsed.success ? sanitizeMatch(parsed.data, data.candidates, data.desired) : null,
        finishReason: result.finishReason,
        usage: {
          input: inputTokens ?? null,
          cachedInput: cached ?? null,
          output: outputTokens ?? null,
        },
        providerEquivalentUsd: cost,
        reservation,
        elapsedMs: Date.now() - started,
      };
    } catch {
      // Error bodies can contain headers or credentials. Unknown usage remains reserved.
      return {
        attempt: data.attempt,
        status: "unknown" as const,
        transportEvidence,
        reservation,
        elapsedMs: Date.now() - started,
        error:
          "Generation failed; usage unknown. Stop and reconcile billing before any further attempt.",
      };
    }
  });
