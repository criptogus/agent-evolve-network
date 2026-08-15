/**
 * Private backup archive: turns a set of cloud skills into the exact on-disk
 * layout a given agent tool expects, so the user keeps an offline, auditable
 * copy of their vault.
 *
 * NOT an install path. Installing the personal vault into a local agent
 * (Claude Code, Codex, Cursor, ...) always happens over MCP via
 * `cloud_skills_sync`, which is conflict-aware and idempotent. The archive
 * therefore ships no install script.
 *
 * Integrity: every payload file (skills, README.md, verify.sh) is hashed, the
 * hashes are rolled into one `content_digest`, and that digest is
 * Ed25519-signed server-side. The result lands in `sak-bundle.json`, which is
 * therefore built LAST and excluded from its own digest.
 *
 * Pure: builds the file list only. Zipping and signing happen server-side in
 * `bundle.server.ts`; the UI reuses this to preview paths.
 */

import {
  getProvider,
  renderSkillFile,
  syncPrompt,
  targetPath,
  type Provider,
  type ProviderScope,
  type SkillForRender,
} from "./providers";

export type BundleFile = { path: string; content: string };

/** Integrity block injected by the server once the payload is known. */
export type BundleIntegrity = {
  algorithm: "ed25519";
  hash: "sha256";
  /** sha256 of sorted `path\0<file sha256>\n` lines, manifest excluded. */
  content_digest: string;
  files: { path: string; sha256: string }[];
  /** base64 Ed25519 signature over the ascii `content_digest`, or null. */
  signature: string | null;
  signing_key_id: string | null;
  public_key_url: string;
  unsigned_reason?: string;
};

export const MANIFEST_PATH = "sak-bundle.json";

/** Global targets live under ~; inside a zip we stage them in `home/`. */
export function bundlePath(p: Provider, scope: ProviderScope, slug: string): string | null {
  const raw = targetPath(p, scope, slug);
  if (!raw) return null;
  return raw.startsWith("~/") ? `home/${raw.slice(2)}` : raw;
}

export function buildManifest(
  provider: Provider,
  scope: ProviderScope,
  skills: SkillForRender[],
  payload: BundleFile[],
  integrity: BundleIntegrity,
): string {
  return `${JSON.stringify(
    {
      spec: "sak-private-bundle/v1",
      generator: "superagentskill.com",
      kind: "private-skill-bundle",
      visibility: "private",
      tool: { id: provider.id, label: provider.label, layout: provider.layout },
      scope,
      target_dir: provider.dirs[scope],
      skills: skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        version: s.version ?? 1,
        path: bundlePath(provider, scope, s.slug),
      })),
      file_count: payload.length,
      integrity,
      verify: {
        command: "bash verify.sh",
        note:
          "Recompute each file's sha256, rebuild content_digest as sha256 of sorted " +
          "`path\\0<file sha256>\\n` lines (this manifest excluded), then verify the base64 " +
          "signature as Ed25519 over the ascii content_digest using the public key at public_key_url.",
      },
    },
    null,
    2,
  )}\n`;
}

function readme(provider: Provider, scope: ProviderScope, skills: SkillForRender[]): string {
  const dir = provider.dirs[scope]!;
  const isGlobal = scope === "global";
  return [
    `# Private skill archive for ${provider.label}`,
    "",
    `${skills.length} skill${skills.length === 1 ? "" : "s"} from your SuperAgent Skill cloud library,`,
    `already shaped for ${provider.label} (${scope} scope, layout: ${provider.layout}).`,
    "",
    "## This archive is a backup, not an installer",
    "",
    `Installing your personal vault into ${provider.label} always happens over MCP:`,
    "the server knows which versions you already have, detects conflicts with your local",
    "files and never deletes anything. A zip cannot do that.",
    "",
    "Paste this in your agent:",
    "",
    "```text",
    syncPrompt(provider.id, scope, "ask"),
    "```",
    "",
    "It calls the MCP tool `cloud_skills_sync` and writes each file at its exact path",
    isGlobal ? `under \`${dir}/\`.` : `under \`${dir}/\` in the current repo.`,
    "Not connected yet? Follow https://superagentskill.com/welcome (one MCP endpoint, OAuth login).",
    "",
    "Use this archive for offline copies, audits, air-gapped machines and long-term retention.",
    "",
    "## Verify this archive",
    "",
    "Every file here is hashed in `sak-bundle.json`, and the combined digest is signed",
    "with the SuperAgent Skill Ed25519 release key:",
    "",
    "```bash",
    "bash verify.sh         # hashes every file, then verifies the signature",
    "```",
    "",
    "Expected output ends with `bundle verified` — anything else means the archive was",
    "modified after export and should not be trusted.",
    "",
    "What is checked:",
    "",
    "1. `integrity.files[]` — sha256 of each payload file, so a single edited byte is caught.",
    "2. `integrity.content_digest` — sha256 of the sorted `path\\0<file sha256>` list, so added or",
    "   removed files are caught too (the manifest itself is excluded from this digest).",
    "3. `integrity.signature` — Ed25519 over the digest, verified against",
    "   `integrity.public_key_url` (also served at https://superagentskill.com/api/public/signing-key.pem),",
    "   so only SuperAgent Skill can produce a matching signature.",
    "",
    "Manual spot check of a single file:",
    "",
    "```bash",
    "shasum -a 256 README.md    # compare with the matching entry in sak-bundle.json",
    "```",
    "",
    "`verify.sh` needs `python3` or `node` for hashing and `openssl` or `node` for the",
    "signature; it says exactly which step it could not run instead of silently passing.",
    "",
    "## What the files map to",
    "",
    ...skills.map((s) => `- \`${bundlePath(provider, scope, s.slug)}\` — ${s.name}`),
    "",
    isGlobal
      ? `> Paths under \`home/\` map 1:1 onto \`$HOME\`, so \`home/${dir.replace(/^~\//, "")}/\` corresponds to \`${dir}/\`.`
      : `> The \`${dir.split("/")[0]}\` folder corresponds to the root of your project.`,
    "",
    `> ${provider.note}`,
    "",
    "## Notes",
    "",
    "- This archive is private: it was generated for your account and contains only your own skills.",
    "- No install script is shipped on purpose — use `cloud_skills_sync` over MCP so versions and conflicts stay tracked.",
    "- Re-export any time to refresh the snapshot; MCP sync always serves the latest versions.",
    "- Exports are deterministic: the same skills produce the same files, hashes and signature.",
  ].join("\n");
}


/**
 * Standalone integrity checker shipped inside the bundle. POSIX sh, no network:
 * hashing via python3/node, signature via openssl/node. Any missing capability
 * is reported loudly rather than treated as a pass.
 */
function verifyScript(): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    "# Verifies this private skill bundle against sak-bundle.json.",
    "# Exit 0 = untouched and signed by SuperAgent Skill. Any other exit = do not install.",
    "",
    'cd "$(cd "$(dirname "$0")" && pwd)"',
    `MANIFEST="${MANIFEST_PATH}"`,
    'if [ ! -f "$MANIFEST" ]; then echo "verify: $MANIFEST missing" >&2; exit 1; fi',
    "",
    'RUNNER="${SAK_VERIFY_RUNNER:-}"',
    'if [ -n "$RUNNER" ]; then :',
    'elif command -v python3 >/dev/null 2>&1; then RUNNER=python3',
    'elif command -v node >/dev/null 2>&1; then RUNNER=node',
    "else",
    '  echo "verify: needs python3 or node to hash files" >&2',
    "  exit 2",
    "fi",
    "",
    'if [ "$RUNNER" = python3 ]; then',
    "python3 - \"$MANIFEST\" <<'PY'",
    "import hashlib, json, os, subprocess, sys, base64, tempfile, urllib.request",
    "manifest_path = sys.argv[1]",
    "m = json.load(open(manifest_path))",
    'integrity = m.get("integrity") or {}',
    'expected = {f["path"]: f["sha256"] for f in integrity.get("files", [])}',
    "if not expected:",
    '    print("verify: manifest has no integrity.files", file=sys.stderr); sys.exit(1)',
    "",
    "def sha(path):",
    '    h = hashlib.sha256()',
    '    with open(path, "rb") as fh:',
    "        for chunk in iter(lambda: fh.read(65536), b\"\"):",
    "            h.update(chunk)",
    "    return h.hexdigest()",
    "",
    "found = {}",
    'for root, _dirs, names in os.walk("."):',
    "    for n in names:",
    '        rel = os.path.relpath(os.path.join(root, n), ".").replace(os.sep, "/")',
    "        if rel == manifest_path:",
    "            continue",
    "        found[rel] = sha(os.path.join(root, n))",
    "",
    "problems = []",
    "for path, want in sorted(expected.items()):",
    "    got = found.get(path)",
    "    if got is None:",
    '        problems.append(f"missing file: {path}")',
    "    elif got != want:",
    '        problems.append(f"modified file: {path}")',
    "for path in sorted(set(found) - set(expected)):",
    '    problems.append(f"unexpected extra file: {path}")',
    "if problems:",
    '    print("verify: FAILED", file=sys.stderr)',
    "    for p in problems:",
    '        print(f"  - {p}", file=sys.stderr)',
    "    sys.exit(1)",
    "",
    'lines = "".join(f"{p}\\0{h}\\n" for p, h in sorted(expected.items())).encode()',
    "digest = hashlib.sha256(lines).hexdigest()",
    'if digest != integrity.get("content_digest"):',
    '    print("verify: FAILED - content_digest mismatch (files added or removed)", file=sys.stderr)',
    "    sys.exit(1)",
    'print(f"verify: {len(expected)} files match, content_digest {digest[:16]}...")',
    "",
    'sig = integrity.get("signature")',
    "if not sig:",
    '    print("verify: bundle is UNSIGNED (%s)" % (integrity.get("unsigned_reason") or "no signature in manifest"), file=sys.stderr)',
    "    sys.exit(3)",
    "",
    'key_path = os.environ.get("SAK_PUBLIC_KEY")',
    "if not key_path:",
    '    url = integrity.get("public_key_url")',
    "    try:",
    '        req = urllib.request.Request(url, headers={"User-Agent": "sak-bundle-verify/1"})',
    "        with urllib.request.urlopen(req, timeout=15) as r:",
    "            pem = r.read()",
    "    except Exception as err:",
    '        print(f"verify: could not fetch public key {url}: {err}", file=sys.stderr)',
    '        print("verify: download it manually and re-run with SAK_PUBLIC_KEY=/path/key.pem", file=sys.stderr)',
    "        sys.exit(4)",
    '    fh = tempfile.NamedTemporaryFile(suffix=".pem", delete=False)',
    "    fh.write(pem); fh.close(); key_path = fh.name",
    "",
    'sig_file = tempfile.NamedTemporaryFile(suffix=".sig", delete=False)',
    "sig_file.write(base64.b64decode(sig)); sig_file.close()",
    'digest_file = tempfile.NamedTemporaryFile(suffix=".txt", delete=False)',
    "digest_file.write(digest.encode()); digest_file.close()",
    "",
    "def openssl_verify():",
    "    return subprocess.run(",
    '        ["openssl", "pkeyutl", "-verify", "-pubin", "-inkey", key_path,',
    '         "-rawin", "-in", digest_file.name, "-sigfile", sig_file.name],',
    "        capture_output=True,",
    "    ).returncode == 0",
    "",
    "def node_verify():",
    "    script = (",
    '        "const c=require(\'crypto\'),f=require(\'fs\');"',
    '        "const ok=c.verify(null,Buffer.from(process.argv[2]),c.createPublicKey(f.readFileSync(process.argv[1])),"',
    '        "Buffer.from(process.argv[3],\'base64\'));process.exit(ok?0:1);"',
    "    )",
    '    return subprocess.run(["node", "-e", script, key_path, digest, sig], capture_output=True).returncode == 0',
    "",
    "ok = None",
    'if subprocess.run(["sh", "-c", "command -v openssl"], capture_output=True).returncode == 0:',
    "    ok = openssl_verify()",
    'if ok is not True and subprocess.run(["sh", "-c", "command -v node"], capture_output=True).returncode == 0:',
    "    ok = node_verify()",
    "if ok is None:",
    '    print("verify: files match but no openssl/node available to check the signature", file=sys.stderr)',
    "    sys.exit(5)",
    "if not ok:",
    '    print("verify: FAILED - signature does not match the SuperAgent Skill key", file=sys.stderr)',
    "    sys.exit(1)",
    'print("verify: signature OK (key %s)" % (integrity.get("signing_key_id") or "?"))',
    'print("bundle verified")',
    "PY",
    "else",
    "node - \"$MANIFEST\" <<'JS'",
    "const c = require('crypto'), fs = require('fs'), path = require('path');",
    "const https = require('https');",
    "const manifestPath = process.argv[2] || 'sak-bundle.json';",
    "const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));",
    "const integrity = m.integrity || {};",
    "const expected = new Map((integrity.files || []).map((f) => [f.path, f.sha256]));",
    "if (!expected.size) { console.error('verify: manifest has no integrity.files'); process.exit(1); }",
    "const sha = (p) => c.createHash('sha256').update(fs.readFileSync(p)).digest('hex');",
    "const found = new Map();",
    "(function walk(dir) {",
    "  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {",
    "    const full = path.join(dir, e.name);",
    "    if (e.isDirectory()) walk(full);",
    "    else {",
    "      const rel = path.relative('.', full).split(path.sep).join('/');",
    "      if (rel !== manifestPath) found.set(rel, sha(full));",
    "    }",
    "  }",
    "})('.');",
    "const problems = [];",
    "for (const [p, want] of [...expected].sort()) {",
    "  const got = found.get(p);",
    "  if (!got) problems.push(`missing file: ${p}`);",
    "  else if (got !== want) problems.push(`modified file: ${p}`);",
    "}",
    "for (const p of [...found.keys()].sort()) if (!expected.has(p)) problems.push(`unexpected extra file: ${p}`);",
    "if (problems.length) { console.error('verify: FAILED'); problems.forEach((p) => console.error('  - ' + p)); process.exit(1); }",
    "const lines = [...expected].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([p, h]) => `${p}\\0${h}\\n`).join('');",
    "const digest = c.createHash('sha256').update(lines).digest('hex');",
    "if (digest !== integrity.content_digest) { console.error('verify: FAILED - content_digest mismatch'); process.exit(1); }",
    "console.log(`verify: ${expected.size} files match, content_digest ${digest.slice(0, 16)}...`);",
    "if (!integrity.signature) { console.error('verify: bundle is UNSIGNED'); process.exit(3); }",
    "const withKey = (pem) => {",
    "  const ok = c.verify(null, Buffer.from(digest), c.createPublicKey(pem), Buffer.from(integrity.signature, 'base64'));",
    "  if (!ok) { console.error('verify: FAILED - signature does not match the SuperAgent Skill key'); process.exit(1); }",
    "  console.log(`verify: signature OK (key ${integrity.signing_key_id || '?'})`);",
    "  console.log('bundle verified');",
    "};",
    "if (process.env.SAK_PUBLIC_KEY) withKey(fs.readFileSync(process.env.SAK_PUBLIC_KEY));",
    "else https.get(integrity.public_key_url, { headers: { 'user-agent': 'sak-bundle-verify/1' } }, (res) => {",
    "  let body = '';",
    "  res.on('data', (d) => (body += d));",
    "  res.on('end', () => withKey(body));",
    "}).on('error', (err) => {",
    "  console.error(`verify: could not fetch public key: ${err.message}`);",
    "  console.error('verify: re-run with SAK_PUBLIC_KEY=/path/key.pem');",
    "  process.exit(4);",
    "});",
    "JS",
    "fi",
    "",
  ].join("\n");
}

/**
 * Payload file list (everything except the manifest), deterministic and sorted.
 * The server hashes/signs this list and appends `sak-bundle.json`.
 */
export function buildBundleFiles(
  providerId: string,
  scope: ProviderScope,
  skills: SkillForRender[],
): { provider: Provider; files: BundleFile[]; skills: SkillForRender[] } {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown tool: ${providerId}`);
  if (!provider.dirs[scope]) throw new Error(`${provider.label} has no ${scope} scope`);

  const ordered = [...skills].sort((a, b) => a.slug.localeCompare(b.slug));
  const skillFiles: BundleFile[] = [];
  for (const s of ordered) {
    const path = bundlePath(provider, scope, s.slug);
    if (!path) continue;
    skillFiles.push({ path, content: renderSkillFile(provider, s) });
  }

  const files: BundleFile[] = [
    ...skillFiles,
    { path: "README.md", content: `${readme(provider, scope, ordered)}\n` },
    { path: "verify.sh", content: verifyScript() },
  ].sort((a, b) => a.path.localeCompare(b.path));

  return { provider, files, skills: ordered };
}

export function bundleFileName(providerId: string, scope: ProviderScope, count: number): string {
  const day = new Date().toISOString().slice(0, 10);
  return `sak-skills-${providerId}-${scope}-${count}-${day}.zip`;
}
