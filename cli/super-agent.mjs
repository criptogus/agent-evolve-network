#!/usr/bin/env node
// Super Agent Skill CLI — install skills locally AND get a fully plug-and-play
// MCP connection (OAuth login, config writing, and a local stdio bridge).
//
// Usage:
//   npx super-agent install <slug> [--target claude|cursor|continue|cline|all]
//   npx super-agent list [--query <q>]
//   npx super-agent search <q>
//   npx super-agent info <slug>
//
//   npx super-agent connect [--client claude-code|claude|cursor|codex|vscode|windsurf]
//   npx super-agent login            # OAuth (browser, loopback PKCE) only
//   npx super-agent status
//   npx super-agent logout
//   npx super-agent setup <client>   # write/patch the MCP config for a client
//   npx super-agent mcp              # local stdio <-> remote HTTP MCP bridge
//
// `connect` is the one-shot path: it logs you in via OAuth and wires the
// chosen client so write tools work with zero manual JSON editing.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const REGISTRY = (process.env.SUPER_AGENT_REGISTRY ?? "https://superagentskill.com").replace(/\/+$/, "");
const TELEMETRY = process.env.SUPER_AGENT_TELEMETRY !== "0";
const MCP_ENDPOINT = `${REGISTRY}/api/mcp`;
const CRED_DIR = join(homedir(), ".superagentskill");
const CRED_FILE = join(CRED_DIR, "credentials.json");

// Commands that run a server / long process must NOT be force-exited.
const LONG_RUNNING = new Set(["connect", "login", "mcp"]);

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "--help" || cmd === "-h") {
  printHelp();
  process.exit(0);
}

try {
  if (cmd === "install") await cmdInstall(rest);
  else if (cmd === "list") await cmdList(rest);
  else if (cmd === "search") await cmdSearch(rest);
  else if (cmd === "info") await cmdInfo(rest);
  else if (cmd === "connect") await cmdConnect(rest);
  else if (cmd === "login") await cmdLogin();
  else if (cmd === "status") await cmdStatus();
  else if (cmd === "logout") await cmdLogout();
  else if (cmd === "setup") await cmdSetup(rest);
  else if (cmd === "mcp") await cmdMcpBridge();
  else {
    console.error(`unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(2);
}

// fetch keep-alive sockets can keep the loop alive ~30s; force a clean exit —
// but never for commands that intentionally keep running.
if (!LONG_RUNNING.has(cmd)) setImmediate(() => process.exit(0));

function printHelp() {
  console.log(`super-agent — install AI agent skills + plug-and-play MCP

Skill install:
  install <slug> [--target claude|cursor|continue|cline|all]   default: all
  list   [--query <q>]
  search <q>
  info   <slug>

MCP connection (plug and play):
  connect [--client <id>]   OAuth login + auto-wire a client in one step
  login                     OAuth login only (browser, loopback PKCE)
  status                    show login state / token expiry
  logout                    revoke and forget the stored token
  setup  <client>           write/patch the MCP config for a client
  mcp                       run a local stdio <-> remote HTTP MCP bridge

  clients: claude-code | claude | cursor | codex | vscode | windsurf

Environment:
  SUPER_AGENT_REGISTRY   override registry origin (default https://superagentskill.com)
  SUPER_AGENT_TELEMETRY  set to 0 to disable anonymized install telemetry
`);
}

function parseFlags(args) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const n = args[i + 1];
      if (!n || n.startsWith("--")) flags[a.slice(2)] = true;
      else {
        flags[a.slice(2)] = n;
        i++;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

async function getJson(path) {
  const res = await fetch(`${REGISTRY}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.json();
}

async function getText(path) {
  const res = await fetch(`${REGISTRY}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.text();
}

/* ---------------- skill install (unchanged behavior) ---------------- */

async function cmdInstall(args) {
  const { positional, flags } = parseFlags(args);
  const slug = positional[0];
  if (!slug) throw new Error("install requires <slug>");
  const target = (flags.target ?? "all").toLowerCase();

  console.log(`→ fetching ${slug} from ${REGISTRY}`);
  const info = await getJson(`/api/public/packages/${slug}`);
  const skillMd = await getText(`/api/skills/${slug}/export.md`).catch(async () => synthesizeSkillMd(info));

  const targets = target === "all" ? ["claude", "cursor", "continue", "cline"] : [target];
  for (const t of targets) writeForTarget(t, slug, skillMd);

  reportTelemetry({ package_slug: slug, runtime: "cli", success: true });
  console.log(`\n✓ installed ${slug} for: ${targets.join(", ")}`);
  console.log(`  trust score: ${REGISTRY}/api/badges/trust/${slug}.svg`);
  console.log(`  package:     ${REGISTRY}/packs/${slug}`);
}

function writeForTarget(target, slug, skillMd) {
  const map = {
    claude: `.claude/skills/${slug}/SKILL.md`,
    cursor: `.cursor/rules/${slug}.mdc`,
    continue: `.continue/skills/${slug}.md`,
    cline: `.cline/skills/${slug}.md`,
  };
  const path = map[target];
  if (!path) {
    console.warn(`  ! unknown target: ${target}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, skillMd);
  console.log(`  + ${path}`);
}

async function cmdList(args) {
  const { flags } = parseFlags(args);
  const q = flags.query ?? "";
  const list = await getJson(`/api/public/packages?type=skill${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  for (const p of list.items ?? list) console.log(`${p.slug.padEnd(36)} ${p.name ?? ""}`);
}

async function cmdSearch(args) {
  if (!args[0]) throw new Error("search requires a query");
  const res = await getJson(`/api/public/search?q=${encodeURIComponent(args.join(" "))}`);
  for (const r of res.results ?? [])
    console.log(`${r.type.padEnd(10)} ${r.slug.padEnd(32)} ${r.score?.toFixed?.(2) ?? ""}  ${r.snippet ?? ""}`);
}

async function cmdInfo(args) {
  const slug = args[0];
  if (!slug) throw new Error("info requires <slug>");
  console.log(JSON.stringify(await getJson(`/api/public/packages/${slug}`), null, 2));
}

function synthesizeSkillMd(info) {
  return [
    `# ${info.name ?? info.slug}`,
    ``,
    info.description ?? "",
    ``,
    `## When to use`,
    info.trigger ?? info.when_to_use ?? "(see package page)",
    ``,
    `## System prompt`,
    info.system_prompt ?? "(not exposed via this endpoint)",
    ``,
    `---`,
    `Installed from ${REGISTRY}/packs/${info.slug}`,
  ].join("\n");
}

function reportTelemetry(event) {
  if (!TELEMETRY) return;
  const body = JSON.stringify({
    latency_ms: 0,
    workspace_id: hashCwd(),
    runtime: "cli",
    ...event,
  });
  // /api/public/* bypasses the published-site auth gate so anonymous CLI
  // users actually reach the handler. The endpoint also relays the event
  // to report_skill_execution so the trust score updates without a token.
  fetch(`${REGISTRY}/api/public/telemetry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }).catch(() => {});
}

function hashCwd() {
  try {
    const cwd = process.cwd();
    const pkg = existsSync("package.json") ? JSON.parse(readFileSync("package.json", "utf8"))?.name : "";
    return `${pkg || "anon"}:${cwd.split("/").slice(-2).join("/")}`;
  } catch {
    return "anon";
  }
}

/* ---------------- OAuth (loopback PKCE) ---------------- */

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function loadCreds() {
  try {
    return JSON.parse(readFileSync(CRED_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveCreds(creds) {
  mkdirSync(CRED_DIR, { recursive: true });
  writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

function openBrowser(url) {
  const cmds =
    platform() === "darwin"
      ? ["open", [url]]
      : platform() === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const p = spawn(cmds[0], cmds[1], { stdio: "ignore", detached: true });
    p.on("error", () => {});
    p.unref();
  } catch {
    /* fall back to manual paste */
  }
}

async function discover() {
  // RFC 9728 → RFC 8414. Fail soft to known defaults if discovery is blocked.
  const fallback = {
    authorization_endpoint: `${REGISTRY}/oauth/authorize`,
    token_endpoint: `${REGISTRY}/api/public/oauth/token`,
    registration_endpoint: `${REGISTRY}/api/public/oauth/register`,
    revocation_endpoint: `${REGISTRY}/api/public/oauth/revoke`,
  };
  try {
    const pr = await getJson(`/.well-known/oauth-protected-resource/api/mcp`).catch(() =>
      getJson(`/.well-known/oauth-protected-resource`),
    );
    const as = (pr.authorization_servers?.[0] ?? REGISTRY).replace(/\/+$/, "");
    const meta = await fetch(`${as}/.well-known/oauth-authorization-server`, {
      headers: { accept: "application/json" },
    }).then((r) => (r.ok ? r.json() : null));
    return meta ?? fallback;
  } catch {
    return fallback;
  }
}

function startCallbackServer() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const codePromise = new Promise((res, rej) => {
        server.on("request", (req, response) => {
          const u = new URL(req.url, redirectUri);
          if (u.pathname !== "/callback") {
            response.writeHead(404).end();
            return;
          }
          const err = u.searchParams.get("error");
          const code = u.searchParams.get("code");
          const state = u.searchParams.get("state");
          response.writeHead(200, { "content-type": "text/html" });
          response.end(
            `<!doctype html><meta charset=utf-8><title>Super Agent Skill</title>` +
              `<body style="font:16px system-ui;text-align:center;padding:14vh 2rem;background:#0b0b0c;color:#eee">` +
              (err
                ? `<h1>Authorization failed</h1><p>${err}</p>`
                : `<h1>✓ Connected</h1><p>You can close this tab and return to your terminal.</p>`) +
              `</body>`,
          );
          server.close();
          if (err) rej(new Error(`authorization denied: ${err}`));
          else res({ code, state });
        });
      });
      resolve({ redirectUri, codePromise });
    });
  });
}

async function oauthLogin() {
  const meta = await discover();
  const { redirectUri, codePromise } = await startCallbackServer();

  // Dynamic client registration with the real loopback redirect.
  const reg = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Super Agent CLI",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      software_id: "super-agent-cli",
    }),
  });
  if (!reg.ok) throw new Error(`client registration failed: HTTP ${reg.status} ${await reg.text()}`);
  const client = await reg.json();
  if (!client.client_id) throw new Error("registration response missing client_id");

  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "mcp:read mcp:write");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("resource", MCP_ENDPOINT);

  console.log(`\n→ Opening your browser to authorize Super Agent Skill…`);
  console.log(`  If it doesn't open, paste this URL:\n  ${authUrl}\n`);
  openBrowser(authUrl.toString());

  const { code, state: returnedState } = await codePromise;
  if (returnedState !== state) throw new Error("state mismatch — aborting (possible CSRF)");

  const tok = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: client.client_id,
      code_verifier: verifier,
    }),
  });
  if (!tok.ok) throw new Error(`token exchange failed: HTTP ${tok.status} ${await tok.text()}`);
  const t = await tok.json();

  const creds = {
    client_id: client.client_id,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    scope: t.scope ?? "mcp:read mcp:write",
    expires_at: Date.now() + (t.expires_in ?? 3600) * 1000,
    token_endpoint: meta.token_endpoint,
    revocation_endpoint: meta.revocation_endpoint,
  };
  saveCreds(creds);
  return creds;
}

async function ensureToken() {
  let creds = loadCreds();
  if (!creds) throw new Error('not logged in — run "super-agent login" first');
  if (Date.now() < creds.expires_at - 60_000) return creds;
  if (!creds.refresh_token) return creds; // will 401 → caller can re-login
  const res = await fetch(creds.token_endpoint ?? `${REGISTRY}/api/public/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refresh_token,
      client_id: creds.client_id,
    }),
  });
  if (!res.ok) return creds;
  const t = await res.json();
  creds = {
    ...creds,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? creds.refresh_token,
    expires_at: Date.now() + (t.expires_in ?? 3600) * 1000,
  };
  saveCreds(creds);
  return creds;
}

/* ---------------- connect / login / status / logout ---------------- */

async function cmdLogin() {
  const creds = await oauthLogin();
  console.log(`\n✓ Logged in. Token saved to ${CRED_FILE}`);
  console.log(`  scope: ${creds.scope}`);
  process.exit(0);
}

async function cmdStatus() {
  const creds = loadCreds();
  if (!creds) {
    console.log("Not logged in. Run: super-agent login");
    return;
  }
  const expired = Date.now() >= creds.expires_at;
  console.log(`Logged in (${REGISTRY})`);
  console.log(`  scope:      ${creds.scope}`);
  console.log(`  access:     ${expired ? "expired" : "valid"}${creds.refresh_token ? " (auto-refresh on)" : ""}`);
  console.log(`  expires_at: ${new Date(creds.expires_at).toISOString()}`);
  console.log(`  file:       ${CRED_FILE}`);
}

async function cmdLogout() {
  const creds = loadCreds();
  if (!creds) {
    console.log("Already logged out.");
    return;
  }
  try {
    await fetch(creds.revocation_endpoint ?? `${REGISTRY}/api/public/oauth/revoke`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: creds.refresh_token ?? creds.access_token }),
    });
  } catch {
    /* best effort */
  }
  try {
    writeFileSync(CRED_FILE, "{}", { mode: 0o600 });
  } catch {
    /* ignore */
  }
  console.log("✓ Logged out and token revoked.");
}

async function cmdConnect(args) {
  const { flags } = parseFlags(args);
  console.log(`Super Agent Skill — connecting (${REGISTRY})`);
  if (!loadCreds()?.access_token || Date.now() >= (loadCreds()?.expires_at ?? 0)) {
    await oauthLogin();
    console.log(`✓ OAuth complete.`);
  } else {
    console.log(`✓ Reusing existing login (super-agent status to inspect).`);
  }
  const client = (flags.client ?? "claude-code").toLowerCase();
  await writeClientConfig(client);
  console.log(`\nDone. Restart ${client} and the Super Agent Skill tools (incl. write tools) will be available.`);
  process.exit(0);
}

/* ---------------- client config writers ---------------- */

function patchJsonFile(file, mutate) {
  mkdirSync(dirname(file), { recursive: true });
  let json = {};
  if (existsSync(file)) {
    try {
      json = JSON.parse(readFileSync(file, "utf8") || "{}");
    } catch {
      throw new Error(`existing ${file} is not valid JSON — fix or remove it first`);
    }
  }
  mutate(json);
  writeFileSync(file, JSON.stringify(json, null, 2));
  console.log(`  + ${file}`);
}

async function writeClientConfig(client) {
  const creds = loadCreds();
  const bearer = creds?.access_token;
  const home = homedir();
  const httpEntry = {
    url: MCP_ENDPOINT,
    ...(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {}),
  };

  switch (client) {
    case "claude-code": {
      // Claude Code reuses the OAuth-capable HTTP transport directly: it will
      // run the same browser flow on first use. The CLI command is the
      // canonical install path; print it (and a bridge fallback).
      console.log(`\nRun this once (Claude Code handles OAuth natively):\n`);
      console.log(`  claude mcp add --transport http super-agent-skill ${MCP_ENDPOINT}\n`);
      console.log(`If your Claude Code build can't do MCP OAuth, use the local bridge instead:\n`);
      console.log(
        `  claude mcp add super-agent-skill -- npx -y super-agent mcp\n` +
          `  (the bridge injects your saved token automatically)\n`,
      );
      return;
    }
    case "claude": {
      const file =
        platform() === "darwin"
          ? join(home, "Library/Application Support/Claude/claude_desktop_config.json")
          : platform() === "win32"
            ? join(process.env.APPDATA ?? join(home, "AppData/Roaming"), "Claude/claude_desktop_config.json")
            : join(home, ".config/Claude/claude_desktop_config.json");
      patchJsonFile(file, (j) => {
        j.mcpServers = j.mcpServers ?? {};
        // Desktop is most reliable via the local bridge (handles auth refresh).
        j.mcpServers["super-agent-skill"] = { command: "npx", args: ["-y", "super-agent", "mcp"] };
      });
      return;
    }
    case "cursor": {
      patchJsonFile(join(process.cwd(), ".cursor/mcp.json"), (j) => {
        j.mcpServers = j.mcpServers ?? {};
        j.mcpServers["super-agent-skill"] = httpEntry;
      });
      return;
    }
    case "vscode": {
      patchJsonFile(join(home, ".config/Code/User/settings.json"), (j) => {
        j.mcp = j.mcp ?? {};
        j.mcp.servers = j.mcp.servers ?? {};
        j.mcp.servers["super-agent-skill"] = { type: "http", ...httpEntry };
      });
      return;
    }
    case "windsurf": {
      patchJsonFile(join(home, ".codeium/windsurf/mcp_config.json"), (j) => {
        j.mcpServers = j.mcpServers ?? {};
        j.mcpServers["super-agent-skill"] = {
          serverUrl: MCP_ENDPOINT,
          ...(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {}),
        };
      });
      return;
    }
    case "codex": {
      // Codex config.toml has no JSON; the local bridge is the clean path.
      const file = join(home, ".codex", "config.toml");
      mkdirSync(dirname(file), { recursive: true });
      const block =
        `\n[mcp_servers.super-agent-skill]\n` +
        `command = "npx"\n` +
        `args = ["-y", "super-agent", "mcp"]\n`;
      const prev = existsSync(file) ? readFileSync(file, "utf8") : "";
      if (prev.includes("[mcp_servers.super-agent-skill]")) {
        console.log(`  = ${file} already has super-agent-skill (left as-is)`);
      } else {
        writeFileSync(file, prev + block);
        console.log(`  + ${file}`);
      }
      return;
    }
    default:
      throw new Error(
        `unknown client "${client}". Use: claude-code | claude | cursor | codex | vscode | windsurf`,
      );
  }
}

async function cmdSetup(args) {
  const client = (args[0] ?? "").toLowerCase();
  if (!client) throw new Error("setup requires <client> (claude-code|claude|cursor|codex|vscode|windsurf)");
  if (!loadCreds()?.access_token)
    console.log('! not logged in — run "super-agent login" first for write-tool access.');
  await writeClientConfig(client);
}

/* ---------------- local stdio <-> HTTP MCP bridge ---------------- */
// Lets ANY stdio-only MCP client speak to the remote Streamable HTTP server
// with the saved OAuth token injected and auto-refreshed. This is the
// "runs locally" path that makes the connection truly plug and play.

async function cmdMcpBridge() {
  let sessionId = null;
  const rl = createInterface({ input: process.stdin });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let creds;
    try {
      creds = await ensureToken();
    } catch {
      creds = null; // anonymous: read-only tools still work
    }
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };
    if (creds?.access_token) headers.authorization = `Bearer ${creds.access_token}`;
    if (sessionId) headers["mcp-session-id"] = sessionId;

    let res;
    try {
      res = await fetch(MCP_ENDPOINT, { method: "POST", headers, body: trimmed });
    } catch (e) {
      emit({ jsonrpc: "2.0", id: safeId(trimmed), error: { code: -32000, message: `bridge fetch failed: ${e.message}` } });
      continue;
    }
    const sid = res.headers.get("mcp-session-id");
    if (sid) sessionId = sid;

    if (res.status === 401) {
      emit({
        jsonrpc: "2.0",
        id: safeId(trimmed),
        error: { code: -32001, message: "unauthorized — run `super-agent login` to enable write tools" },
      });
      continue;
    }

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/event-stream")) {
      const text = await res.text();
      for (const chunk of text.split(/\n\n/)) {
        const dataLines = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());
        if (!dataLines.length) continue;
        const payload = dataLines.join("");
        if (payload && payload !== "[DONE]") process.stdout.write(payload + "\n");
      }
    } else {
      const text = (await res.text()).trim();
      if (text) process.stdout.write(text + "\n");
    }
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function safeId(line) {
  try {
    return JSON.parse(line).id ?? null;
  } catch {
    return null;
  }
}
