import { createFileRoute } from "@tanstack/react-router";
import { classifyUserAgent } from "@/lib/telemetry/bot-detect";

/**
 * Anonymous connectivity diagnostic. Answers, in one curl, the question
 * clients keep asking: "am I being blocked, and by what?"
 *
 * If this returns 200 the origin saw the request (so any 403 the caller got on
 * another path came from the edge firewall, not from us). The payload echoes
 * exactly what the server observed — client IP, User-Agent, and whether that
 * UA is classified bot-shaped — so the caller can tell an IP-reputation block
 * apart from a UA-shaped block without guessing.
 *
 * No auth, no writes, no PII beyond what the caller itself sent.
 */
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function payload(request: Request) {
  const ua = request.headers.get("user-agent");
  const cls = classifyUserAgent(ua);
  return JSON.stringify(
    {
      ok: true,
      reached_origin: true,
      observed: {
        user_agent: ua ?? null,
        ua_family: cls.family,
        ua_looks_like_bot: cls.isBot,
        ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? null,
        country: request.headers.get("cf-ipcountry") ?? null,
        accept: request.headers.get("accept") ?? null,
      },
      guidance: cls.isBot
        ? "Your User-Agent is bot-shaped. Send a browser-shaped UA (e.g. 'Mozilla/5.0') on every request — edge Bot Fight Mode rejects generic agent UAs before the request reaches us."
        : "UA looks fine. If another endpoint returns 403 while this returns 200, the block is edge-firewall/IP-reputation shaped: use https://superagentskill.com/api/public/mcp (firewall-safe path) and keep the browser-shaped UA.",
      canonical_mcp: "https://superagentskill.com/api/public/mcp",
      docs: "https://superagentskill.com/docs/mcp",
      ts: new Date().toISOString(),
    },
    null,
    2,
  );
}

export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      HEAD: async () => new Response(null, { status: 200, headers }),
      GET: async ({ request }) => new Response(payload(request), { status: 200, headers }),
    },
  },
});
