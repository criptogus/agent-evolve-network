import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * AI Gateway resolution.
 *
 * Production deployments have shifted between two configurations:
 *
 *  A. Lovable AI gateway (legacy): LOVABLE_API_KEY set, model ids like
 *     "google/gemini-3-flash-preview", base URL https://ai.gateway.lovable.dev/v1.
 *  B. Generic OpenAI-compatible gateway (current .env.example):
 *     AI_GATEWAY_API_KEY + AI_GATEWAY_BASE_URL set, default model
 *     "openai/gpt-4o-mini".
 *
 * Up until now this helper hard-coded the Lovable URL and only read
 * LOVABLE_API_KEY — so a deployment running config (B) had every
 * generateText() call die with "LOVABLE_API_KEY missing" BEFORE the
 * author fallback chain ever got a chance to try its alternate models.
 * That's why uploads silently failed across the site even after PR #21
 * added model fallbacks: the gateway helper itself never returned a
 * usable model.
 *
 * Now we resolve in this priority:
 *
 *  1. AI_GATEWAY_API_KEY  → generic gateway, base URL from
 *     AI_GATEWAY_BASE_URL (default OpenAI v1).
 *  2. LOVABLE_API_KEY     → Lovable gateway (legacy).
 *  3. OPENAI_API_KEY      → direct OpenAI.
 *
 * The error thrown when nothing is configured names the env vars so an
 * operator sees the cause immediately in logs / Vercel.
 */

type GatewayConfig = {
  baseURL: string;
  apiKey: string;
  /** Which env var supplied the key — surfaced in logs/errors for ops. */
  source: "AI_GATEWAY_API_KEY" | "LOVABLE_API_KEY" | "OPENAI_API_KEY";
  /** Header shape that auth uses on this gateway. */
  authStyle: "lovable" | "bearer";
};

function resolveConfig(): GatewayConfig {
  if (process.env.AI_GATEWAY_API_KEY) {
    return {
      baseURL: process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1",
      apiKey: process.env.AI_GATEWAY_API_KEY,
      source: "AI_GATEWAY_API_KEY",
      authStyle: "bearer",
    };
  }
  if (process.env.LOVABLE_API_KEY) {
    return {
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: process.env.LOVABLE_API_KEY,
      source: "LOVABLE_API_KEY",
      authStyle: "lovable",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      baseURL: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      source: "OPENAI_API_KEY",
      authStyle: "bearer",
    };
  }
  throw new Response(
    "No AI gateway configured. Set one of: AI_GATEWAY_API_KEY (+ AI_GATEWAY_BASE_URL), LOVABLE_API_KEY, or OPENAI_API_KEY.",
    { status: 500 },
  );
}

function providerFor(cfg: GatewayConfig) {
  if (cfg.authStyle === "lovable") {
    return createOpenAICompatible({
      name: "lovable",
      baseURL: cfg.baseURL,
      headers: {
        "Lovable-API-Key": cfg.apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
  }
  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
  });
}

// Backwards-compatible export — callers in older code paths constructed
// a provider explicitly with a Lovable key. New code should just call
// `getGatewayModel`.
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

/**
 * Return an LM Studio / Vercel-AI-SDK compatible model object for the
 * given model id. Pass `"default"` (or omit) to use the env-configured
 * default — useful for "just pick whatever works" call sites.
 */
export function getGatewayModel(modelId: string = "default") {
  const cfg = resolveConfig();
  const resolved =
    modelId === "default"
      ? process.env.AI_GATEWAY_MODEL || "google/gemini-2.5-flash"
      : modelId;
  return providerFor(cfg)(resolved);
}

/**
 * Diagnostic — which env supplied the key, the base URL, and the
 * default model. Returned by an admin debug endpoint and used by
 * server-side logs to make config drift visible.
 */
export function describeGatewayConfig(): {
  configured: boolean;
  source: GatewayConfig["source"] | null;
  baseURL: string | null;
  defaultModel: string;
  authStyle: GatewayConfig["authStyle"] | null;
} {
  try {
    const cfg = resolveConfig();
    return {
      configured: true,
      source: cfg.source,
      baseURL: cfg.baseURL,
      defaultModel: process.env.AI_GATEWAY_MODEL || "google/gemini-2.5-flash",
      authStyle: cfg.authStyle,
    };
  } catch {
    return {
      configured: false,
      source: null,
      baseURL: null,
      defaultModel: process.env.AI_GATEWAY_MODEL || "(unset)",
      authStyle: null,
    };
  }
}
