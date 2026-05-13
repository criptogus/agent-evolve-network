#!/usr/bin/env node
// Local Playbook runner. Uses a mock LLM by default; pass --gateway to use the
// AI gateway (requires AI_GATEWAY_BASE_URL + AI_GATEWAY_API_KEY).
//
// Usage:
//   node scripts/run-playbook.mjs --playbook bug-triage --inputs '{"report":"...","repo_context":"node"}'
//   node scripts/run-playbook.mjs --playbook bug-triage --inputs-file ./inputs.json --gateway

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const args = parseArgs(process.argv.slice(2));
if (!args.playbook) {
  console.error("Usage: --playbook <slug> [--inputs '{...}'] [--inputs-file path] [--gateway]");
  process.exit(1);
}

const ROOT = new URL("..", import.meta.url).pathname;
const yamlPath = join(ROOT, `content/playbooks/${args.playbook}.yaml`);
const yaml = parseYaml(readFileSync(yamlPath, "utf8"));

const inputs = args.inputs
  ? JSON.parse(args.inputs)
  : args["inputs-file"]
    ? JSON.parse(readFileSync(args["inputs-file"], "utf8"))
    : {};

const { compilePlaybook } = await import(`${ROOT}/src/lib/runtime/compile.ts`);
const { runPlaybook } = await import(`${ROOT}/src/lib/runtime/run.ts`);

const adapters = args.gateway ? await gatewayAdapters() : mockAdapters();
const result = await runPlaybook(compilePlaybook(yaml), inputs, adapters);

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "error" ? 2 : 0);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2), n = argv[i + 1];
    if (!n || n.startsWith("--")) out[k] = true;
    else { out[k] = n; i++; }
  }
  return out;
}

function mockAdapters() {
  return {
    invokeInstruction: async ({ prompt }) => `[mock-llm] ${prompt.slice(0, 80)}...`,
    invokeSkill: async ({ slug, inputs }) => `[mock-skill:${slug}] ${JSON.stringify(inputs).slice(0, 80)}`,
    invokeTool: async ({ name, inputs }) => ({ name, inputs }),
    onTelemetry: (e) => console.error(`[telemetry] ${JSON.stringify(e)}`),
  };
}

async function gatewayAdapters() {
  const { AI_GATEWAY_BASE_URL, AI_GATEWAY_API_KEY, AI_GATEWAY_MODEL = "openai/gpt-4o-mini" } = process.env;
  if (!AI_GATEWAY_BASE_URL || !AI_GATEWAY_API_KEY) {
    console.error("AI_GATEWAY_BASE_URL and AI_GATEWAY_API_KEY required for --gateway");
    process.exit(1);
  }
  const chat = async (prompt) => {
    const r = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${AI_GATEWAY_API_KEY}` },
      body: JSON.stringify({
        model: AI_GATEWAY_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });
    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  };
  return {
    invokeInstruction: ({ prompt }) => chat(prompt),
    invokeSkill: ({ slug, inputs }) => chat(`Invoke skill ${slug} with inputs: ${JSON.stringify(inputs)}`),
    onTelemetry: (e) => console.error(`[telemetry] ${JSON.stringify(e)}`),
  };
}
