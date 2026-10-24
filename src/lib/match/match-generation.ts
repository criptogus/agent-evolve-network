// Same generator profile for production and both paired-evaluation arms.
export const MATCH_GENERATOR_MODEL = "openai/gpt-5.2";
export const MATCH_MAX_OUTPUT_TOKENS = 4096;
export const MATCH_PROVIDER_OPTIONS = { supportsStructuredOutputs: true } as const;
export function matchGenerationOptions() {
  return {
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(180000),
    // OpenAI-compatible SDK otherwise emits deprecated max_tokens. GPT-5.2
    // uses max_completion_tokens; this bounds visible and reasoning output.
    providerOptions: {
      lovable: {
        max_completion_tokens: MATCH_MAX_OUTPUT_TOKENS,
        reasoningEffort: "low",
        textVerbosity: "low",
      },
      "ai-gateway": {
        max_completion_tokens: MATCH_MAX_OUTPUT_TOKENS,
        reasoningEffort: "low",
        textVerbosity: "low",
      },
    },
  };
}
