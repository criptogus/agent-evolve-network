import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type ToolKey =
  | "list_packages"
  | "search_registry"
  | "get_package"
  | "request_primitive"
  | "upload_packages";

type Result = {
  status: number;
  latencyMs: number;
  ok: boolean;
  raw: string;
  parsed?: any;
  error?: string;
};

const ENDPOINT = "/api/mcp";
const TOKEN_LS_KEY = "sas_mcp_test_token";

const TOOL_DEFAULTS: Record<ToolKey, Record<string, any>> = {
  list_packages: { type: "", query: "", limit: 10 },
  search_registry: { query: "soul", limit: 5 },
  get_package: { slug: "" },
  request_primitive: { type: "skill", brief: "", industry: "" },
  upload_packages: {
    publish: false,
    files: [{ name: "example.md", type: "skill", content: "" }],
  },
};

const TOOL_REQUIRES_AUTH: Record<ToolKey, boolean> = {
  list_packages: false,
  search_registry: false,
  get_package: false,
  request_primitive: false,
  upload_packages: true,
};

function parseMcpResponse(text: string): any {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fallthrough */
    }
  }
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
  const [rememberToken, setRememberToken] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  // Load persisted token on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.localStorage.getItem(TOKEN_LS_KEY);
    if (t) {
      setToken(t);
      setRememberToken(true);
    }
  }, []);

  // Persist when toggled.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rememberToken && token.trim()) {
      window.localStorage.setItem(TOKEN_LS_KEY, token.trim());
    } else if (!rememberToken) {
      window.localStorage.removeItem(TOKEN_LS_KEY);
    }
  }, [token, rememberToken]);

  const switchTool = (t: ToolKey) => {
    setTool(t);
    setArgs(structuredClone(TOOL_DEFAULTS[t]));
    setResult(null);
  };

  const updateArg = (k: string, v: any) =>
    setArgs((prev) => ({ ...prev, [k]: v }));

  const updateFile = (i: number, k: string, v: any) =>
    setArgs((prev) => {
      const files = [...(prev.files ?? [])];
      files[i] = { ...files[i], [k]: v };
      return { ...prev, files };
    });

  const addFile = () =>
    setArgs((prev) => ({
      ...prev,
      files: [...(prev.files ?? []), { name: "", type: "skill", content: "" }],
    }));

  const removeFile = (i: number) =>
    setArgs((prev) => ({
      ...prev,
      files: (prev.files ?? []).filter((_: any, idx: number) => idx !== i),
    }));

  const cleanArgs = () => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(args)) {
      if (v === "" || v === undefined || v === null) continue;
      if (k === "limit") {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) out[k] = n;
        continue;
      }
      if (k === "files" && Array.isArray(v)) {
        out[k] = v
          .filter((f: any) => f?.name && f?.content)
          .map((f: any) => ({
            name: String(f.name),
            content: String(f.content),
            ...(f.type ? { type: f.type } : {}),
          }));
        continue;
      }
      out[k] = v;
    }
    if (tool === "upload_packages" && token.trim()) {
      out.auth_token = token.trim();
    }
    return out;
  };

  async function callRpc(body: Record<string, any>): Promise<Result> {
    const started = performance.now();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), ...body }),
      });
      const text = await res.text();
      const latencyMs = Math.round(performance.now() - started);
      const parsed = parseMcpResponse(text);
      const unwrapped =
        body.method === "tools/call" && parsed
          ? unwrapToolResult(parsed)
          : (parsed?.result ?? parsed);
      return {
        status: res.status,
        latencyMs,
        ok: res.ok,
        raw: text,
        parsed: unwrapped,
      };
    } catch (e: any) {
      return {
        status: 0,
        latencyMs: Math.round(performance.now() - started),
        ok: false,
        raw: "",
        error: e?.message ?? "Network error",
      };
    }
  }

  const run = async () => {
    setPending(true);
    setResult(null);
    setResult(
      await callRpc({
        method: "tools/call",
        params: { name: tool, arguments: cleanArgs() },
      })
    );
    setPending(false);
  };

  const listTools = async () => {
    setPending(true);
    setResult(null);
    setResult(await callRpc({ method: "tools/list" }));
    setPending(false);
  };

  const checkHealth = async () => {
    setPending(true);
    setResult(null);
    const started = performance.now();
    try {
      const res = await fetch("/api/public/mcp/health");
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep raw */
      }
      setResult({
        status: res.status,
        latencyMs: Math.round(performance.now() - started),
        ok: res.ok,
        raw: text,
        parsed,
      });
    } catch (e: any) {
      setResult({
        status: 0,
        latencyMs: Math.round(performance.now() - started),
        ok: false,
        raw: "",
        error: e?.message ?? "Network error",
      });
    } finally {
      setPending(false);
    }
  };

  const needsAuth = TOOL_REQUIRES_AUTH[tool];
  const missingToken = needsAuth && !token.trim();

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

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={listTools}
          disabled={pending}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
        >
          📜 tools/list
        </button>
        <button
          onClick={checkHealth}
          disabled={pending}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
        >
          ❤️ /api/public/mcp/health
        </button>
      </div>

      {/* Tool tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            "list_packages",
            "search_registry",
            "get_package",
            "request_primitive",
            "upload_packages",
          ] as ToolKey[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => switchTool(t)}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono transition ${
              tool === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {TOOL_REQUIRES_AUTH[t] && (
              <span className="ml-1.5 text-[10px] opacity-60">🔒</span>
            )}
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
        {tool === "request_primitive" && (
          <>
            <Field label="type">
              <select
                value={args.type ?? "skill"}
                onChange={(e) => updateArg("type", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="skill">skill</option>
                <option value="playbook">playbook</option>
                <option value="soul">soul</option>
                <option value="guardrail">guardrail</option>
              </select>
            </Field>
            <Field label="industry (optional)">
              <input
                value={args.industry ?? ""}
                onChange={(e) => updateArg("industry", e.target.value)}
                placeholder="e.g. fintech"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
            <Field label="brief (≥20 chars)" wide>
              <textarea
                value={args.brief ?? ""}
                onChange={(e) => updateArg("brief", e.target.value)}
                placeholder="Describe the missing primitive, the use case, and the industry context."
                rows={4}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </Field>
          </>
        )}
        {tool === "upload_packages" && (
          <>
            <Field label="publish on upload" wide>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!args.publish}
                  onChange={(e) => updateArg("publish", e.target.checked)}
                />
                Publish immediately (otherwise saved as draft for review)
              </label>
            </Field>
            <div className="md:col-span-3 space-y-3">
              {(args.files ?? []).map((f: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <input
                      value={f.name}
                      onChange={(e) => updateFile(i, "name", e.target.value)}
                      placeholder="file name (e.g. cardiology.md)"
                      className="h-8 flex-1 rounded-md border border-border bg-card px-2 font-mono text-xs"
                    />
                    <select
                      value={f.type ?? "skill"}
                      onChange={(e) => updateFile(i, "type", e.target.value)}
                      className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                    >
                      <option value="skill">skill</option>
                      <option value="playbook">playbook</option>
                      <option value="soul">soul</option>
                      <option value="guardrail">guardrail</option>
                    </select>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      remove
                    </button>
                  </div>
                  <textarea
                    value={f.content}
                    onChange={(e) => updateFile(i, "content", e.target.value)}
                    placeholder="Paste markdown / prompt / JSON (≥20 chars)"
                    rows={5}
                    className="w-full rounded-md border border-border bg-card p-2 font-mono text-xs"
                  />
                </div>
              ))}
              <button
                onClick={addFile}
                className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                + add file
              </button>
            </div>
          </>
        )}
      </div>

      {/* Auth */}
      <details className="mt-3" open={needsAuth}>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Authorization {needsAuth ? "(required)" : "(optional)"}
        </summary>
        <div className="mt-2 space-y-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sas_..."
            className="h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-xs"
          />
          <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(e) => setRememberToken(e.target.checked)}
            />
            Remember on this device (localStorage)
          </label>
          <p className="text-[11px] text-muted-foreground">
            Sent as <code>Authorization: Bearer …</code>. Mint one at{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              /account/tokens
            </Link>
            .
          </p>
        </div>
      </details>

      {/* Run */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={pending || missingToken}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
          title={missingToken ? "This tool requires a token" : ""}
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
        {missingToken && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Add a token above to enable {tool}.
          </span>
        )}
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
                Result
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
