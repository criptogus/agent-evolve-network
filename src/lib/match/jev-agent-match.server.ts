import { z } from "zod";
import {
  buildJevRequest,
  JEV_MATCH_MODEL,
  JEV_MATCH_PROTOCOL,
  selectMatchCandidates,
  type DesiredKit,
  type MatchCandidate,
} from "./jev-selection.ts";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MAX_CATALOG = 800;
const MAX_BODY = 48000;
const MAX_RESPONSE = 64000;
const ResponseSchema = z.object({
  model: z.literal(JEV_MATCH_MODEL),
  answers: z.record(
    z.string(),
    z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
  ),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});
export type MatchSelectionTrace = {
  protocol: string;
  mode: "off" | "shadow" | "filter";
  status: "skipped" | "complete" | "fallback";
  reason: string;
  model: string | null;
  catalog_count: number;
  selected_count: number;
  forwarded_count: number;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  usage_complete: boolean;
  elapsed_ms: number;
  failures?: Array<{ stage: string; http_status?: number; category?: string }>;
};
export type JevMatchOptions = {
  apiKey?: string;
  mode?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

// No gateway fallback: this module talks only to TypeSafe. Nothing here can
// call Lovable, change compatibility, approve, publish or execute a package.
export async function preselectAgentMatch(
  input: {
    brief: string;
    vertical?: string;
    catalog: MatchCandidate[];
    desired: DesiredKit;
    consent: boolean;
  },
  options: JevMatchOptions = {},
) {
  const catalog = input.catalog;
  const started = Date.now();
  const key = options.apiKey ?? process.env.TYPESAFE_API_KEY;
  const configuredMode = options.mode ?? process.env.JEV_AGENT_MATCH_MODE ?? "shadow";
  const mode = configuredMode === "filter" || configuredMode === "shadow" ? configuredMode : "off";
  const trace: MatchSelectionTrace = {
    protocol: JEV_MATCH_PROTOCOL,
    mode,
    status: "skipped",
    reason: "disabled",
    model: null,
    catalog_count: catalog.length,
    selected_count: catalog.length,
    forwarded_count: catalog.length,
    requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    usage_complete: true,
    elapsed_ms: 0,
  };
  const finish = (candidates = catalog) => ({
    candidates,
    trace: { ...trace, forwarded_count: candidates.length, elapsed_ms: Date.now() - started },
  });
  if (!input.consent) {
    trace.reason = "not_consented";
    return finish();
  }
  if (mode === "off") return finish();
  if (!key) {
    trace.reason = "not_configured";
    return finish();
  }
  if (
    !catalog.length ||
    catalog.length > MAX_CATALOG ||
    new Set(catalog.map((c) => c.slug)).size !== catalog.length
  ) {
    trace.status = "fallback";
    trace.reason = "invalid_catalog";
    return finish();
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(5000, Math.max(1, options.timeoutMs ?? 3000)),
  );
  const transport = options.fetch ?? fetch;
  const probabilities = new Array<number>(catalog.length);
  const batches = Array.from({ length: Math.ceil(catalog.length / 40) }, (_, i) => ({
    offset: i * 40,
    candidates: catalog.slice(i * 40, i * 40 + 40),
  }));
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < batches.length) {
      const batch = batches[next++];
      let stage = "request_validation";
      let httpStatus: number | undefined;
      try {
        const request = buildJevRequest(input.brief, input.vertical, batch.candidates);
        const body = JSON.stringify(request);
        if (new TextEncoder().encode(body).byteLength > MAX_BODY || body.includes(key!))
          throw new Error("Input rejected");
        trace.requests++;
        stage = "transport";
        const response = await transport(ENDPOINT, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body,
          // Manual mode is supported by the managed transport; 3xx fails below.
          // Never follow a redirect or forward the credential to another origin.
          redirect: "manual",
          signal: controller.signal,
        });
        httpStatus = response.status;
        stage = "http_response";
        if (!response.ok) throw new Error("Provider unavailable");
        stage = "response_body";
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty response");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.byteLength;
            if (size > MAX_RESPONSE) throw new Error("Oversized response");
            chunks.push(part.value);
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const raw = new TextDecoder().decode(bytes);
        if (raw.includes(key!)) throw new Error("Response rejected");
        stage = "response_schema";
        const parsed = ResponseSchema.parse(JSON.parse(raw));
        if (
          Object.keys(parsed.answers).length !== batch.candidates.length ||
          batch.candidates.some((_, i) => !parsed.answers[`c${i}`])
        )
          throw new Error("Incomplete answers");
        batch.candidates.forEach((_, i) => {
          probabilities[batch.offset + i] = parsed.answers[`c${i}`].noul;
        });
        trace.input_tokens += parsed.usage.input_tokens;
        trace.output_tokens += parsed.usage.output_tokens;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // Fixed categories only; provider/runtime messages may contain credentials.
        const category = /header|ByteString|character|token/i.test(message)
          ? "invalid_header"
          : /redirect/i.test(message)
            ? "redirect_rejected"
            : /blocked|not allowed|allowlist|denied|outbound/i.test(message)
              ? "egress_rejected"
              : /abort|timeout/i.test(message)
                ? "aborted"
                : /fetch|network|DNS|connect/i.test(message)
                  ? "network"
                  : "unclassified";
        (trace.failures ??= []).push({
          stage,
          ...(stage === "transport" ? { category } : {}),
          ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
        });
        failed = true;
        controller.abort();
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(4, batches.length) }, worker));
    if (failed) {
      trace.status = "fallback";
      trace.reason = "provider_error";
      trace.usage_complete = false;
      return finish();
    }
    const result = selectMatchCandidates(catalog, probabilities, input.desired);
    trace.status = "complete";
    trace.reason = result.reason;
    trace.model = JEV_MATCH_MODEL;
    trace.selected_count = result.candidates.length;
    return finish(mode === "filter" ? result.candidates : catalog);
  } finally {
    clearTimeout(timeout);
  }
}
