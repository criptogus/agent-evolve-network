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
  xml?: { raw: string; status: number },
) {
  if (!rawResponses.length || rawResponses.length > 2)
    throw new Error("Explicit bounded provider fixtures required");
  const dir = mkdtempSync(join(tmpdir(), "sas source state #cli-"));
  try {
    const log = join(dir, "provider-requests.json"),
      preload = join(dir, "transport.mjs"),
      xmlLog = join(dir, "xml-request.json");
    const xmlPreload = xml
      ? `import child from "node:child_process"; import { syncBuiltinESMExports } from "node:module"; child.spawnSync = (file,args,options) => { if(file !== "/fixture/xml-python" || args.length !== 2 || args[0] !== "-I" || !args[1].endsWith("/scripts/parse-nfe.py")) throw new Error("Unexpected child process"); writeFileSync(${JSON.stringify(xmlLog)},options.input); return {status:${xml.status},stdout:${JSON.stringify(xml.raw)},stderr:"",signal:null}; }; syncBuiltinESMExports();\n`
      : "";
    writeFileSync(
      preload,
      `import { writeFileSync } from 'node:fs';\n${xmlPreload}const responses=${JSON.stringify(rawResponses)}, calls=[];\nglobalThis.fetch = async (url, init) => { if (String(url) !== 'https://api.typesafe.ai/v1/systemone') throw new Error('Unexpected generator or external transport'); if(calls.length>=responses.length) throw new Error('Unexpected repeat or extra call'); const raw=responses[calls.length]; calls.push({url:String(url),body:JSON.parse(init.body)}); writeFileSync(${JSON.stringify(log)},JSON.stringify(calls)); return new Response(raw, {status:200}); };\n`,
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
          ...(xml ? { LOCAL_MODEL_PYTHON: "/fixture/xml-python" } : {}),
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
    const xmlRequest: unknown = existsSync(xmlLog)
      ? JSON.parse(readFileSync(xmlLog, "utf8"))
      : null;
    return { ...result, requests, xmlRequest };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
