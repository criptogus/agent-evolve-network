import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Canonical host. The OAuth issuer / resource metadata is minted against the
// bare apex (see ORIGIN in lib/oauth/mcp-oauth.server.ts), so a client that
// connects via www.* would see an issuer/resource mismatch and refuse the
// token. Redirect the www alias to the apex before anything else runs.
const CANONICAL_HOST = "superagentskill.com";

function canonicalRedirect(request: Request): Response | null {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (url.host !== `www.${CANONICAL_HOST}`) return null;
  url.host = CANONICAL_HOST;
  return new Response(null, {
    status: 301,
    headers: { Location: url.toString(), "Cache-Control": "public, max-age=86400" },
  });
}

// Cloudflare kills a Worker whose handler never resolves ("code had hung and
// would never generate a response"). A stuck downstream await (e.g. a
// PostgREST query killed by the statement timeout manager, leaving the fetch
// pending) is enough to trigger it. Bound every request so we always answer.
const REQUEST_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "__timeout__"> {
  return Promise.race([
    promise,
    new Promise<"__timeout__">((resolve) => setTimeout(() => resolve("__timeout__"), ms)),
  ]);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const redirect = canonicalRedirect(request);
      if (redirect) return redirect;
      const handler = await getServerEntry();
      const result = await withTimeout(
        Promise.resolve(handler.fetch(request, env, ctx)),
        REQUEST_TIMEOUT_MS,
      );
      if (result === "__timeout__") {
        console.error(
          new Error(`SSR request timed out after ${REQUEST_TIMEOUT_MS}ms: ${request.url}`),
        );
        return new Response(renderErrorPage(), {
          status: 503,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "retry-after": "5",
            "cache-control": "no-store",
          },
        });
      }
      return await normalizeCatastrophicSsrResponse(result);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};

