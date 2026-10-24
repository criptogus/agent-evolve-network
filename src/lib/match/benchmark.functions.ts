import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { matchGenerationOptions, MATCH_PROVIDER_OPTIONS } from "./match-generation.ts";
import { streamMatchResult } from "./result-stream.ts";
import { preselectAgentMatch } from "./jev-agent-match.server.ts";
import { z } from "zod";
import { buildMatchOutputSchema, buildMatchPrompt, sanitizeMatch } from "./match-contract";
import {
  BENCHMARK_MODEL,
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
  candidates: z.array(candidate).length(665),
  arm: z.enum(["baseline", "jev"]),
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
    if (data.arm === "jev" && !process.env.TYPESAFE_API_KEY)
      throw new Error("TypeSafe is not configured; no inference started");
    if (attempts.has(data.attempt) || attempts.size >= 72)
      throw new Error("Attempt already started or finite batch exhausted");
    if (new Set(data.candidates.map((c) => c.slug)).size !== data.candidates.length)
      throw new Error("Duplicate catalog slugs");
    const fullPrompt = buildMatchPrompt(data);
    const reservation = reserveGeneration(
      fullPrompt.system,
      fullPrompt.prompt,
      JSON.stringify(z.toJSONSchema(buildMatchOutputSchema(data.candidates, data.desired))),
      data.remaining,
    );
    attempts.add(data.attempt);
    return streamMatchResult(async (signal) => {
      const started = Date.now();
      const selectionBatches: Array<{
        offset: number;
        model: string;
        probabilities: number[];
        inputTokens: number;
        outputTokens: number;
      }> = [];
      const selection = await preselectAgentMatch(
        {
          brief: data.brief,
          catalog: data.candidates,
          desired: data.desired,
          consent: data.arm === "jev",
        },
        {
          mode: data.arm === "jev" ? "filter" : "off",
          fetch: async (url, init) => {
            const response = await fetch(url, init);
            if (response.ok) {
              const sent = z
                .object({
                  state: z.object({ candidates: z.array(z.object({ slug: z.string() })).min(1) }),
                })
                .parse(JSON.parse(String(init?.body)));
              const parsed = z
                .object({
                  model: z.literal("jev-1.14.0"),
                  answers: z.record(
                    z.string(),
                    z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
                  ),
                  usage: z.object({
                    input_tokens: z.number().int().nonnegative(),
                    output_tokens: z.number().int().nonnegative(),
                  }),
                })
                .safeParse(await response.clone().json());
              if (parsed.success)
                selectionBatches.push({
                  offset: data.candidates.findIndex(
                    (c) => c.slug === sent.state.candidates[0].slug,
                  ),
                  model: parsed.data.model,
                  probabilities: sent.state.candidates.map(
                    (_, i) => parsed.data.answers[`c${i}`]?.noul ?? -1,
                  ),
                  inputTokens: parsed.data.usage.input_tokens,
                  outputTokens: parsed.data.usage.output_tokens,
                });
            }
            return response;
          },
        },
      );
      if (!selection.trace.usage_complete)
        return {
          attempt: data.attempt,
          status: "unknown" as const,
          reservation,
          elapsedMs: Date.now() - started,
          selection: selection.trace,
          selectionBatches,
          generatorStarted: false,
          error: "TypeSafe usage incomplete; generator not started. Stop without automatic retry.",
        };
      const { system, prompt } = buildMatchPrompt({ ...data, candidates: selection.candidates });
      const generatorStarted = Date.now();
      let transportEvidence: string | null = null;
      let transportStatus: number | null = null;
      const provider = createOpenAICompatible({
        name: "lovable",
        ...MATCH_PROVIDER_OPTIONS,
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          transportStatus = response.status;
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
          if (!response.ok) {
            const text = await response.clone().text();
            if (!text.includes(key)) {
              const error = z
                .object({ error: z.object({ message: z.string().max(1000) }) })
                .safeParse(JSON.parse(text));
              if (error.success) transportEvidence = JSON.stringify(error.data);
            }
          }
          return response;
        },
      });
      try {
        const result = await generateText({
          model: provider(BENCHMARK_MODEL),
          system,
          prompt,
          output: Output.object({
            schema: buildMatchOutputSchema(selection.candidates, data.desired),
          }),
          ...matchGenerationOptions(),
          abortSignal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
        });
        const usage = result.usage;
        const inputTokens = usage.inputTokens,
          outputTokens = usage.outputTokens,
          cached = usage.inputTokenDetails.cacheReadTokens;
        // Retain a completed transport even if schema/finish/metering fails. No output repair.
        const parsed = buildMatchOutputSchema(selection.candidates, data.desired).safeParse(
          JSON.parse(result.text),
        );
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
          transportStatus,
          parsed: parsed.success ? parsed.data : null,
          clean: parsed.success
            ? sanitizeMatch(parsed.data, selection.candidates, data.desired)
            : null,
          finishReason: result.finishReason,
          usage: {
            input: inputTokens ?? null,
            cachedInput: cached ?? null,
            output: outputTokens ?? null,
          },
          providerEquivalentUsd: cost,
          reservation,
          elapsedMs: Date.now() - started,
          generatorElapsedMs: Date.now() - generatorStarted,
          selection: selection.trace,
          selectionBatches,
          forwardedSlugs: selection.candidates.map((c) => c.slug),
          generatorStarted: true,
        };
      } catch {
        // Error bodies can contain headers or credentials. Unknown usage remains reserved.
        return {
          attempt: data.attempt,
          status: "unknown" as const,
          transportEvidence,
          transportStatus,
          reservation,
          elapsedMs: Date.now() - started,
          generatorElapsedMs: Date.now() - generatorStarted,
          selection: selection.trace,
          selectionBatches,
          forwardedSlugs: selection.candidates.map((c) => c.slug),
          generatorStarted: true,
          error:
            "Generation failed; usage unknown. Stop and reconcile billing before any further attempt.",
        };
      }
    });
  });

// Read-only preflight: confirms the normal authenticated backend path without
// spending inference budget or reserving an attempt.
export const getBenchmarkReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireBenchmarkPreview(getRequest().url);
    const role = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error || !role.data) throw new Response("Forbidden", { status: 403 });
    return {
      ready: !!process.env.LOVABLE_API_KEY,
      jevConfigured: !!process.env.TYPESAFE_API_KEY,
      jevMode: process.env.JEV_AGENT_MATCH_MODE ?? "shadow",
      provider: "lovable-ai",
      model: BENCHMARK_MODEL,
    };
  });

export const probeBenchmarkTransport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireBenchmarkPreview(getRequest().url);
    const role = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error || !role.data) throw new Response("Forbidden", { status: 403 });
    return streamMatchResult(
      async (signal) => {
        const started = Date.now();
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 25000);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("Probe canceled"));
            },
            { once: true },
          );
        });
        return { elapsedMs: Date.now() - started, payload: "synthetic".repeat(16384) };
      },
      { timeoutMs: 35000 },
    );
  });

// Finite provider diagnosis: one public synthetic candidate, no generator or retry.
export const probeBenchmarkJev = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireBenchmarkPreview(getRequest().url);
    const role = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role.error || !role.data) throw new Response("Forbidden", { status: 403 });
    const result = await preselectAgentMatch(
      {
        brief: "Verify citations against source evidence",
        catalog: [
          {
            slug: "citation-checker",
            name: "Citation Checker",
            type: "skill",
            description: "Verifies that quoted facts truly appear in the cited source.",
          },
        ],
        desired: { skills: 1, playbooks: 0, souls: 0, guardrails: 0 },
        consent: true,
      },
      { mode: "shadow" },
    );
    return { trace: result.trace, generatorStarted: false };
  });
