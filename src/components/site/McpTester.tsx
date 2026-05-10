import { useState } from "react";
import { Link } from "@tanstack/react-router";

type ToolKey = "list_packages" | "search_registry" | "get_package";

type Result = {
  status: number;
  latencyMs: number;
  ok: boolean;
  raw: string;
  parsed?: any;
  error?: string;
};

const ENDPOINT = "/api/mcp";

const TOOL_DEFAULTS: Record<ToolKey, Record<string, any>> = {
  list_packages: { type: "", query: "", limit: 10 },
  search_registry: { query: "soul", limit: 5 },
  get_package: { slug: "" },
};

function parseMcpResponse(text: string): any {
  // MCP Streamable HTTP can return application/json or text/event-stream.
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fallthrough */
    }
  }
  // SSE: collect last data: line(s)
  const dataLines = trimmed
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .filter(Boolean);
  for (let i = dataLines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(dataLines[i]);
    } catch {
      /* keep trying */
    }
  }
  return null;
}

function unwrapToolResult(parsed: any): any {
  // tools/call envelope: { result: { content: [{ type:"text", text:"..." }] } }
  const content = parsed?.result?.content;
  if (Array.isArray(content)) {
    const text = content.find((c: any) => c?.type === "text")?.text;
    if (typeof text === "string") {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return parsed?.result ?? parsed;
}

export function McpTester() {
  const [tool, setTool] = useState<ToolKey>("list_packages");
  const [args, setArgs] = useState<Record<string, any>>(TOOL_DEFAULTS.list_packages);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  const setTool2 = (t: ToolKey) => {
    setTool(t);
    setArgs(TOOL_DEFAULTS[t]);
    setResult(null);
  };

  const updateArg = (k: string, v: any) =>
    setArgs((prev) => ({ ...prev, [k]: v }));

  const cleanArgs = () => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(args)) {
      if (v === "" || v === undefined || v === null) continue;
      if (k === "limit") {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) out[k] = n;
        continue;
      }
      out[k] = v;
    }
    return out;
  };

  const run = async () => {
    setPending(true);
    setResult(null);
    const started = performance.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };
      if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;

      const body = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: tool, arguments: cleanArgs() },
      };

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const latencyMs = Math.round(performance.now() - started);
      const parsed = parseMcpResponse(text);
      const unwrapped = parsed ? unwrapToolResult(parsed) : null;
      setResult({
        status: res.status,
        latencyMs,
        ok: res.ok,
        raw: text,
        parsed: unwrapped,
      });
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - started);
      setResult({
        status: 0,
        latencyMs,
        ok: false,
        raw: "",
        error: e?.message ?? "Network error",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      id="test-mcp"
      className="mb-10 scroll-mt-24 rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Test MCP live</h2>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          Same endpoint your client will hit
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Calls{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">POST {ENDPOINT}</code> with the
        proper <code className="rounded bg-muted px-1 py-0.5 text-xs">Accept</code> header. Read
        tools work anonymously; write tools need a token from{" "}
        <Link to="/account/tokens" className="text-primary hover:underline">
          /account/tokens
        </Link>
        .
      </p>

      {/* Tool tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["list_packages", "search_registry", "get_package"] as ToolKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTool2(t)}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono transition ${
              tool === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Params */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tool === "list_packages" && (
          <>
            <Field label="type (optional)">
              <select
                value={args.type ?? ""}
                onChange={(e) => updateArg("type", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">any</option>
                <option value="skill">skill</option>
                <option value="playbook">playbook</option>
                <option value="soul">soul</option>
                <option value="guardrail">guardrail</option>
              </select>
            </Field>
            <Field label="query (optional)">
              <input
                value={args.query ?? ""}
                onChange={(e) => updateArg("query", e.target.value)}
                placeholder="e.g. cardiology"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
            <Field label="limit">
              <input
                type="number"
                min={1}
                max={50}
                value={args.limit ?? 10}
                onChange={(e) => updateArg("limit", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
          </>
        )}
        {tool === "search_registry" && (
          <>
            <Field label="query">
              <input
                value={args.query ?? ""}
                onChange={(e) => updateArg("query", e.target.value)}
                placeholder="e.g. SDR outbound"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
            <Field label="limit">
              <input
                type="number"
                min={1}
                max={20}
                value={args.limit ?? 5}
                onChange={(e) => updateArg("limit", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
          </>
        )}
        {tool === "get_package" && (
          <Field label="slug" wide>
            <input
              value={args.slug ?? ""}
              onChange={(e) => updateArg("slug", e.target.value)}
              placeholder="e.g. cardiology-soul"
              className="h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-sm"
            />
          </Field>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Authorization (optional, for write tools)
        </summary>
        <div className="mt-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sas_..."
            className="h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sent as <code>Authorization: Bearer …</code>. Not stored.
          </p>
        </div>
      </details>

      {/* Run */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
        >
          {pending ? "Calling…" : `▶ Run ${tool}`}
        </button>
        {result && (
          <span className="font-mono text-xs text-muted-foreground">
            <span
              className={
                result.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }
            >
              {result.status || "ERR"}
            </span>{" "}
            · {result.latencyMs}ms
          </span>
        )}
        <button
          onClick={() => {
            const snippet = `curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}${ENDPOINT} \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream'${token ? ` \\\n  -H 'Authorization: Bearer ${token}'` : ""} \\
  -d '${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: tool, arguments: cleanArgs() },
  })}'`;
            navigator.clipboard?.writeText(snippet).catch(() => {});
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Copy as curl
        </button>
      </div>

      {/* Output */}
      {result && (
        <div className="mt-4 space-y-2">
          {result.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {result.error}
            </div>
          )}
          {result.parsed !== undefined && result.parsed !== null && (
            <div>
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Tool result
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                {typeof result.parsed === "string"
                  ? result.parsed
                  : JSON.stringify(result.parsed, null, 2)}
              </pre>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
              Raw HTTP response
            </summary>
            <pre className="mt-2 max-h-[260px] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              {result.raw || "(empty)"}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-xs ${wide ? "md:col-span-3" : ""}`}>
      <span className="mb-1 block font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
