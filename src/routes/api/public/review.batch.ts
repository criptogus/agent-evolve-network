import { createFileRoute } from "@tanstack/react-router";
import { computeReview } from "@/lib/mcp/tools/skills";
import { projectImpact, projectionToText } from "@/lib/skills/impact-projection";
import { requirePaidBearer } from "@/lib/auth/paid.server";

/**
 * Batch plain-JSON review — evaluate several documents in one request.
 *
 * Same engine and same response shape per item as POST /api/public/review,
 * but N documents per call and no JSON-RPC/SSE framing anywhere in the path.
 * Paid-only (Agent Pass / Enterprise): the semantic/substance judge is the
 * expensive part, so batch fan-out is gated behind an active subscription.
 *
 * Budget-aware by design: the serverless request has a hard ceiling, so the
 * handler scores items with bounded concurrency and stops claiming new work
 * when the remaining budget can't fit another document. Unscored items come
 * back with `status: "skipped"` so the caller resubmits exactly those.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

const TYPES = new Set(["skill", "playbook", "soul", "guardrail"]);
const DOC_CLASSES = new Set(["skill", "governance", "playbook-ops", "guardrail-ops", "auto"]);
const LANGS = new Set(["en", "pt", "es", "fr", "de", "it"]);

const MAX_ITEMS = 20;
const MAX_CONTENT = 120_000;
const MAX_TOTAL_CONTENT = 600_000;
/** Whole-request budget; leaves headroom under the platform request ceiling. */
const TOTAL_BUDGET_MS = 55_000;
/** Don't start another document unless at least this much budget remains. */
const PER_ITEM_RESERVE_MS = 8_000;
const CONCURRENCY = 3;

type Item = {
  index: number;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  content: string;
  doc_class: "skill" | "governance" | "playbook-ops" | "guardrail-ops" | "auto";
  semantic_check: boolean;
  language?: "en" | "pt" | "es" | "fr" | "de" | "it";
};

async function scoreOne(item: Item) {
  const core = await computeReview({
    name: item.name,
    type: item.type,
    content: item.content,
    doc_class: item.doc_class,
    semantic_check: item.semantic_check,
    language: item.language,
  });

  const ceiling = (core.doc_class as { expected_ceiling?: number } | undefined)?.expected_ceiling;
  const impact = projectImpact({
    score: core.verdict_score as number,
    targetScore: typeof ceiling === "number" ? ceiling : undefined,
    actionsCount: (core.top_actions as unknown[]).length,
    semanticPass: Boolean((core.semantic_pass as { ran?: boolean } | undefined)?.ran),
  });

  return {
    index: item.index,
    name: item.name,
    status: "done" as const,
    error: null,
    ...core,
    impact_projection: {
      ...impact,
      summary: projectionToText(impact),
      report_note:
        "Projected values on the public SAK outcome metrics if top_actions are applied. Interpolated from network anchors — an estimate, not a guarantee.",
    },
  };
}

export const Route = createFileRoute("/api/public/review/batch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // Self-documenting GET so poking the URL returns the contract.
      GET: async () =>
        json({
          ok: true,
          endpoint: "/api/public/review/batch",
          method: "POST",
          content_type: "application/json",
          auth: "Required. `Authorization: Bearer <token>` — OAuth access token from the MCP connection, or a personal token from /account/tokens. Agent Pass or Enterprise subscription required.",
          note: "Same engine and per-item response shape as POST /api/public/review, N documents per call. No JSON-RPC, no SSE.",
          limits: {
            max_items: MAX_ITEMS,
            max_content_chars_per_item: MAX_CONTENT,
            max_total_content_chars: MAX_TOTAL_CONTENT,
            budget_ms: TOTAL_BUDGET_MS,
            concurrency: CONCURRENCY,
            note: "Items the request budget could not reach return status \"skipped\" — resubmit only those. Set semantic_check:false for a much faster, format-only batch.",
          },
          body_schema: {
            items: `array (1-${MAX_ITEMS}) of { name, type?, content, doc_class?, semantic_check?, language? } — same fields as the single-document endpoint`,
            semantic_check: "boolean (optional) — default for every item that does not set its own",
            language: "en | pt | es | fr | de | it (optional) — default for every item that does not set its own",
          },
          response_schema: {
            ok: "boolean",
            requested: "number of items received",
            scored: "number scored in this request",
            failed: "number that errored",
            skipped: "number the budget could not reach",
            results: "array, one row per input item, ordered by `index`: { index, name, status: done|failed|skipped, error, ...same body as the single-document response }",
            summary: "{ average_overall_score, average_format_score, average_substance_score, best, worst } across scored items",
          },
          example: {
            curl: `curl -sS https://superagentskill.com/api/public/review/batch -H 'Authorization: Bearer $SAK_TOKEN' -H 'Content-Type: application/json' -d '{"items":[{"name":"a.md","content":"..."},{"name":"b.md","content":"..."}]}'`,
          },
        }),

      POST: async ({ request }) => {
        const t0 = Date.now();

        const auth = await requirePaidBearer(request);
        if (!auth.ok) {
          return json(
            {
              ok: false,
              error: auth.error,
              message: auth.message,
              upgrade_url: "https://superagentskill.com/pricing",
              free_alternative: "POST /api/public/review (one document per request, no auth)",
            },
            auth.status,
          );
        }

        let body: Record<string, unknown> | null = null;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "invalid_json", message: "Body must be valid JSON." }, 400);
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ ok: false, error: "invalid_body", message: "Body must be a JSON object with an `items` array." }, 400);
        }

        const rawItems = Array.isArray(body.items) ? body.items : null;
        if (!rawItems || rawItems.length === 0) {
          return json(
            { ok: false, error: "items_required", message: "`items` must be a non-empty array of documents." },
            400,
          );
        }
        if (rawItems.length > MAX_ITEMS) {
          return json(
            {
              ok: false,
              error: "too_many_items",
              message: ``items` holds ${rawItems.length} documents; the maximum is ${MAX_ITEMS} per request. Split the batch.`,
            },
            413,
          );
        }

        const defaultSemantic = body.semantic_check === false ? false : true;
        const defaultLanguage =
          typeof body.language === "string" && LANGS.has(body.language) ? (body.language as Item["language"]) : undefined;

        // Validate everything up front so a single bad document never leaves
        // the caller guessing which row broke — invalid rows come back as
        // `failed` in place, valid rows still get scored.
        const results = new Map<number, Record<string, unknown>>();
        const queue: Item[] = [];
        let totalChars = 0;

        rawItems.forEach((raw: unknown, index: number) => {
          const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
          const name =
            typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 200) : `untitled-${index + 1}`;
          const content = typeof row.content === "string" ? row.content : "";

          const fail = (error: string, message: string) =>
            results.set(index, { index, name, status: "failed", error, message });

          if (content.trim().length < 20) {
            fail("content_too_short", "`content` must be at least 20 characters of verbatim file text.");
            return;
          }
          if (content.length > MAX_CONTENT) {
            fail("content_too_long", `\`content\` exceeds ${MAX_CONTENT} characters. Split the file.`);
            return;
          }
          totalChars += content.length;
          if (totalChars > MAX_TOTAL_CONTENT) {
            fail(
              "batch_too_large",
              `Total \`content\` across the batch exceeds ${MAX_TOTAL_CONTENT} characters. Split the batch.`,
            );
            return;
          }

          queue.push({
            index,
            name,
            type: typeof row.type === "string" && TYPES.has(row.type) ? (row.type as Item["type"]) : "skill",
            content,
            doc_class:
              typeof row.doc_class === "string" && DOC_CLASSES.has(row.doc_class)
                ? (row.doc_class as Item["doc_class"])
                : "auto",
            semantic_check: row.semantic_check === false ? false : row.semantic_check === true ? true : defaultSemantic,
            language:
              typeof row.language === "string" && LANGS.has(row.language)
                ? (row.language as Item["language"])
                : defaultLanguage,
          });
        });

        // Bounded fan-out: workers pull from the shared queue and stop as soon
        // as the remaining budget can't fit another document, so the response
        // always comes back inside the request ceiling.
        let cursor = 0;
        const worker = async () => {
          for (;;) {
            if (Date.now() - t0 > TOTAL_BUDGET_MS - PER_ITEM_RESERVE_MS) return;
            const item = queue[cursor++];
            if (!item) return;
            try {
              results.set(item.index, await scoreOne(item));
            } catch (err) {
              console.error("[api/public/review/batch] item failed", item.name, err);
              results.set(item.index, {
                index: item.index,
                name: item.name,
                status: "failed",
                error: "review_failed",
                message: "The engine could not score this document. Retry this item on its own.",
              });
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

        // Anything still unscored ran out of budget, not validity.
        for (const item of queue) {
          if (!results.has(item.index)) {
            results.set(item.index, {
              index: item.index,
              name: item.name,
              status: "skipped",
              error: "budget_exhausted",
              message:
                "The request budget ran out before this document was scored. Resubmit it, or send semantic_check:false for a faster format-only pass.",
            });
          }
        }

        const ordered = rawItems.map((_: unknown, i: number) => results.get(i)!);
        const done = ordered.filter((r) => r.status === "done");
        const avg = (pick: (r: Record<string, unknown>) => unknown) => {
          const nums = done.map(pick).filter((v): v is number => typeof v === "number");
          return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
        };
        const byScore = [...done].sort(
          (a, b) => ((b.overall_score as number) ?? 0) - ((a.overall_score as number) ?? 0),
        );
        const brief = (r: Record<string, unknown> | undefined) =>
          r ? { index: r.index, name: r.name, overall_score: r.overall_score ?? null, grade: r.grade ?? null } : null;

        return json({
          ok: true,
          requested: ordered.length,
          scored: done.length,
          failed: ordered.filter((r) => r.status === "failed").length,
          skipped: ordered.filter((r) => r.status === "skipped").length,
          elapsed_ms: Date.now() - t0,
          summary: {
            average_overall_score: avg((r) => r.overall_score),
            average_format_score: avg((r) => r.format_score),
            average_substance_score: avg((r) => r.substance_score),
            best: brief(byScore[0]),
            worst: brief(byScore[byScore.length - 1]),
          },
          results: ordered,
        });
      },
    },
  },
});
