/** Finite actual-CLI transport fixture. Never calls a real provider or approves a model. */
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
export function runSourceStateCli(
  slug: string,
  inputs: Record<string, string>,
  rawResponses: string[],
  consent: boolean,
) {
  if (!rawResponses.length || rawResponses.length > 2)
    throw new Error("Explicit bounded provider fixtures required");
  const dir = mkdtempSync(join(tmpdir(), "sas source state #cli-"));
  try {
    const log = join(dir, "provider-requests.json"),
      preload = join(dir, "transport.mjs");
    writeFileSync(
      preload,
      `import { writeFileSync } from 'node:fs';\nconst responses=${JSON.stringify(rawResponses)}, calls=[];\nglobalThis.fetch = async (url, init) => { if (String(url) !== 'https://api.typesafe.ai/v1/systemone') throw new Error('Unexpected generator or external transport'); if(calls.length>=responses.length) throw new Error('Unexpected repeat or extra call'); const raw=responses[calls.length]; calls.push({url:String(url),body:JSON.parse(init.body)}); writeFileSync(${JSON.stringify(log)},JSON.stringify(calls)); return new Response(raw, {status:200}); };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--import",
        pathToFileURL(preload).href,
        "scripts/run-playbook.ts",
        "--playbook",
        slug,
        "--inputs",
        JSON.stringify(inputs),
        "--gateway",
        ...(consent ? ["--semantic-source-facts", "--allow-typesafe-source-upload"] : []),
      ],
      {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          TYPESAFE_API_KEY: "fixture-private-key",
          AI_GATEWAY_BASE_URL: "http://127.0.0.1:1",
          AI_GATEWAY_API_KEY: "fixture-only",
          AI_GATEWAY_MODEL: "fixture-only",
        },
      },
    );
    const requests: Array<{ url: string; body: unknown }> = existsSync(log)
      ? JSON.parse(readFileSync(log, "utf8"))
      : [];
    return { ...result, requests };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
