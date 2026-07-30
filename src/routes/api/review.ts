import { createFileRoute } from "@tanstack/react-router";
import { computeReview, type ReviewArgs } from "@/lib/mcp/tools/skills";

// POST /api/review — plain-JSON front door to the review engine.
//
// The MCP endpoint speaks JSON-RPC (with SSE when the client asks for it),
// which is exactly right for MCP clients and pure friction for everything
// else. This route runs the SAME engine as the `review_skill` MCP tool
// (one scorer, two doors — same pattern as /api/public/certify) and returns
// the full payload as application/json: overall_score, structural_score,
// content_quality_score, grade, pillars, semantic_pass, partial flag.
//
//   curl -X POST https://superagentskill.com/api/review \
//     -H 'Content-Type: application/json' \
//     -d '{"name":"my-skill","type":"skill","content":"..."}'
//
// No auth. Rate-limited per IP (best-effort, per warm isolate).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

const RATE = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = RATE.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    RATE.set(ip, { count: 1, windowStart: now });
    if (RATE.size > 5000) RATE.clear();
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

const TYPES = new Set(["skill", "playbook", "soul", "guardrail"]);
const DOC_CLASSES = new Set(["auto", "skill", "governance", "playbook-ops", "guardrail-ops"]);
const LANGS = new Set(["en", "pt", "es", "fr", "de", "it"]);
const MAX_CONTENT = 400_000; // ~400KB — comfortably above real skill files

async function handlePost(request: Request): Promise<Response> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "rate_limited", hint: `Max ${RATE_LIMIT} reviews per hour per IP.` }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(
      { error: "invalid_json", hint: "Send a JSON body with at least { content }." },
      400,
    );
  }

  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    return json(
      { error: "missing_content", hint: "`content` (the skill file text) is required." },
      400,
    );
  }
  if (content.length > MAX_CONTENT) {
    return json({ error: "content_too_large", hint: `Max ${MAX_CONTENT} characters.` }, 413);
  }

  const type = typeof body.type === "string" && TYPES.has(body.type) ? body.type : "skill";
  const docClass =
    typeof body.doc_class === "string" && DOC_CLASSES.has(body.doc_class) ? body.doc_class : "auto";
  const language =
    typeof body.language === "string" && LANGS.has(body.language) ? body.language : undefined;

  const args = {
    name: typeof body.name === "string" && body.name.trim() ? body.name.slice(0, 120) : "untitled",
    type,
    content,
    doc_class: docClass,
    // Default ON — the semantic pass is the engine's highest-value feature.
    semantic_check: body.semantic_check !== false,
    language,
  } as ReviewArgs;

  try {
    const core = await computeReview(args);
    return json(core);
  } catch (e) {
    return json({ error: "review_failed", detail: (e as Error).message }, 500);
  }
}

export const Route = createFileRoute("/api/review")({
  server: {
    handlers: {
      POST: ({ request }) => handlePost(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
