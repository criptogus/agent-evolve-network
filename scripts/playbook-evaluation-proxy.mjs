/** Actual evaluation transport, retaining the case binding while a request drains. */
import { createServer } from "node:http";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
const hash = (s) => createHash("sha256").update(s).digest("hex");
export function createPlaybookEvaluationProxy({ upstreamUrl, getActive, nextStep, dir, planHash }) {
  const append = (file, row) =>
    appendFileSync(join(dir, file), JSON.stringify({ ...row, planHash }) + "\n");
  return createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      try {
        const upstream = await fetch(`${upstreamUrl}/health`, {
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        });
        res.writeHead(upstream.status, { "content-type": "application/json" });
        res.end(await upstream.text());
      } catch {
        res.writeHead(502);
        res.end("{}");
      }
      return;
    }
    const caseId = getActive()?.id;
    if (!caseId || req.method !== "POST" || req.url !== "/chat/completions") {
      res.writeHead(400);
      res.end();
      return;
    }
    let body = "";
    try {
      for await (const chunk of req) body += chunk;
      JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const step = nextStep();
    append("attempts.jsonl", {
      event: "step_started",
      case_id: caseId,
      step,
      request_sha256: hash(body),
    });
    const started = Date.now();
    try {
      const response = await fetch(`${upstreamUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(180000),
      });
      const raw = await response.text();
      const record = {
        case_id: caseId,
        step,
        request: JSON.parse(body),
        status: response.status,
        raw,
        duration_ms: Date.now() - started,
        planHash,
      };
      appendFileSync(join(dir, "transport.jsonl"), JSON.stringify(record) + "\n");
      append("attempts.jsonl", {
        event: "step_completed",
        case_id: caseId,
        step,
        transport_sha256: hash(JSON.stringify(record)),
      });
      if (!res.destroyed) {
        res.writeHead(response.status, { "content-type": "application/json" });
        res.end(raw);
      }
    } catch (error) {
      append("attempts.jsonl", { event: "step_unknown", case_id: caseId, step, error: error.name });
      if (!res.destroyed) {
        res.writeHead(502);
        res.end("{}");
      }
    }
  });
}
