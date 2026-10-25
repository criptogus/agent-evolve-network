#!/usr/bin/env node
// Local Playbook runner. Uses a mock LLM by default; pass --gateway to use the
// AI gateway (requires AI_GATEWAY_BASE_URL + AI_GATEWAY_API_KEY).
//
// Usage:
//   node scripts/run-playbook.ts --playbook bug-triage --inputs '{"report":"...","repo_context":"node"}'
//   node scripts/run-playbook.ts --playbook bug-triage --inputs-file ./inputs.json --gateway

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { buildGatewayMessages } from "../src/lib/runtime/gateway-messages.ts";
import {
  validateLocalGatewayHealth,
  textOnlyContent,
} from "../src/lib/runtime/local-model-contract.ts";

const args = parseArgs(process.argv.slice(2));
for (const flag of ["gateway", "semantic-source-facts", "allow-typesafe-source-upload"]) {
  if (Object.hasOwn(args, flag) && args[flag] !== true) {
    console.error(
      "Boolean execution/consent flags require bare presence; string values are rejected",
    );
    process.exit(2);
  }
}
if (!args.playbook) {
  console.error("Usage: --playbook <slug> [--inputs '{...}'] [--inputs-file path] [--gateway]");
  process.exit(1);
}

const ROOT_URL = new URL("..", import.meta.url);
const ROOT = fileURLToPath(ROOT_URL);
const yamlPath = join(ROOT, `content/playbooks/${args.playbook}.yaml`);
const yaml = parseYaml(readFileSync(yamlPath, "utf8"));

const inputs = args.inputs
  ? JSON.parse(args.inputs)
  : args["inputs-file"]
    ? JSON.parse(readFileSync(args["inputs-file"], "utf8"))
    : {};

const { compilePlaybook } = await import(new URL("src/lib/runtime/compile.ts", ROOT_URL).href);
const { runPlaybook } = await import(new URL("src/lib/runtime/run.ts", ROOT_URL).href);

const interpretedPlaybook = [
  "solution-monthly-finance-close",
  "solution-supplier-selection",
  "solution-secure-agent-launch",
].includes(args.playbook);
const generatedSolution = ["solution-brazil-reconciliation"].includes(args.playbook);
let localContract;
let localEvidence;
const contractPath = join(ROOT, "references/runtime-profile.json");
if (args.gateway && existsSync(contractPath)) {
  try {
    localContract = JSON.parse(readFileSync(contractPath, "utf8"));
    if (
      ["finance-source-state-v3", "supplier-source-state-v1", "security-source-state-v1"].includes(
        localContract.execution,
      )
    ) {
      const expected =
        args.playbook === "solution-monthly-finance-close"
          ? "finance-source-state-v3"
          : args.playbook === "solution-supplier-selection"
            ? "supplier-source-state-v1"
            : args.playbook === "solution-secure-agent-launch"
              ? "security-source-state-v1"
              : null;
      if (localContract.execution !== expected) throw new Error("Source-state workflow mismatch");
      if (
        process.versions.node !== localContract.node ||
        process.arch !== localContract.architecture
      )
        throw new Error("Source-state host runtime mismatch");
      localEvidence = {
        execution: localContract.execution,
        model: localContract.model,
        node: process.versions.node,
        architecture: process.arch,
      };
    } else {
      const { localGatewayUrl, verifyLocalModel } = await import(
        new URL("src/lib/runtime/local-model-contract.ts", ROOT_URL).href
      );
      const origin = localGatewayUrl(process.env.AI_GATEWAY_BASE_URL ?? "");
      localEvidence = await verifyLocalModel(
        localContract,
        process.env.AI_GATEWAY_MODEL ?? "",
        process.env.LOCAL_MODEL_PYTHON ?? "",
      );
      const healthResponse = await fetch(`${origin}/health`, {
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      const health = await healthResponse.json();
      if (!healthResponse.ok) throw new Error("Local gateway health unavailable");
      validateLocalGatewayHealth(localContract, health, process.env.AI_GATEWAY_MODEL);

      if (
        args.playbook === "solution-monthly-finance-close" &&
        (!args["semantic-source-facts"] || !args["allow-typesafe-source-upload"])
      )
        throw new Error("Packaged finance requires original qualified source-facts protocol");
      localEvidence = { ...localEvidence, health };
    }
    if (
      interpretedPlaybook &&
      (!args["semantic-source-facts"] || !args["allow-typesafe-source-upload"])
    )
      throw new Error("Source-state execution requires explicit source upload consent");
  } catch {
    console.error(
      "Packaged local model/runtime contract rejected before source upload or generation",
    );
    process.exit(2);
  }
}
if (args["semantic-source-facts"] && !interpretedPlaybook && !generatedSolution) {
  console.error("Source interpretation is supported only for declared solution workflows");
  process.exit(2);
}
let sourceFacts;
let sourceFactsProviderEvidence;
const sourceFactsProviderCalls = [];
if (args["semantic-source-facts"] && interpretedPlaybook) {
  if (
    !args.gateway ||
    !args["allow-typesafe-source-upload"] ||
    !interpretedPlaybook ||
    !process.env.TYPESAFE_API_KEY
  ) {
    console.error(
      "Source facts require a supported source-state playbook, --gateway, --allow-typesafe-source-upload and private TYPESAFE_API_KEY",
    );
    process.exit(2);
  }
  try {
    const derive =
      args.playbook === "solution-secure-agent-launch"
        ? (await import(new URL("src/lib/runtime/security-source-facts.server.ts", ROOT_URL).href))
            .deriveSecuritySourceFacts
        : args.playbook === "solution-supplier-selection"
          ? (
              await import(
                new URL("src/lib/runtime/supplier-source-facts.server.ts", ROOT_URL).href
              )
            ).deriveSupplierSourceFacts
          : (await import(new URL("src/lib/runtime/finance-source-facts.server.ts", ROOT_URL).href))
              .deriveFinanceSourceFacts;
    sourceFacts = await derive(inputs, process.env.TYPESAFE_API_KEY, fetch, (evidence) => {
      sourceFactsProviderEvidence = evidence;
      sourceFactsProviderCalls.push(evidence);
    });
  } catch {
    const failureOutput = JSON.stringify({
      status: "error",
      stage: "source_facts",
      source_facts_provider_calls: sourceFactsProviderCalls,
      error: "Source-facts extraction failed; no graph stage started",
      ...(sourceFactsProviderEvidence
        ? { source_facts_provider_evidence: sourceFactsProviderEvidence }
        : {}),
    });
    await new Promise((resolve, reject) =>
      process.stdout.write(failureOutput + "\n", (error) =>
        error ? reject(error) : resolve(undefined),
      ),
    );
    process.exit(2);
  }
}
let workflowContext;
if (args.gateway && generatedSolution) {
  try {
    const { prepareWorkflowContext } = await import(
      new URL("src/lib/runtime/workflow-source-context.ts", ROOT_URL).href
    );
    const prepared = prepareWorkflowContext(inputs);
    if (
      prepared.request &&
      (!args["semantic-source-facts"] || !args["allow-typesafe-source-upload"])
    )
      throw new Error("Explicit interpretation consent required");
    if (
      localContract &&
      (localContract.workflow_interpreter?.model !== "jev-1.14.0" ||
        localContract.workflow_interpreter?.protocol !== "quarantine-source-notes-v1")
    )
      throw new Error("Workflow interpreter profile mismatch");
    const { deriveWorkflowContext } = await import(
      new URL("src/lib/runtime/workflow-source-context.server.ts", ROOT_URL).href
    );
    workflowContext = await deriveWorkflowContext(
      inputs,
      process.env.TYPESAFE_API_KEY ?? "",
      fetch,
      (evidence) => {
        sourceFactsProviderEvidence = evidence;
        sourceFactsProviderCalls.push(evidence);
      },
    );
  } catch {
    const failure = JSON.stringify({
      status: "error",
      stage: "workflow_context",
      error:
        "Workflow source preparation failed before generation; explicit upload consent and private interpreter key are required for annotations",
      ...(sourceFactsProviderEvidence
        ? { source_facts_provider_evidence: sourceFactsProviderEvidence }
        : {}),
    });
    await new Promise((resolve, reject) =>
      process.stdout.write(failure + "\n", (error) => (error ? reject(error) : resolve(undefined))),
    );
    process.exit(2);
  }
}
const financeMode = args.gateway && args.playbook === "solution-monthly-finance-close";
const securityMode = args.gateway && args.playbook === "solution-secure-agent-launch";
if (args.gateway && interpretedPlaybook && !sourceFacts) {
  console.error(
    "Source-state execution requires --semantic-source-facts and explicit source upload consent",
  );
  process.exit(2);
}
if (
  args.gateway &&
  interpretedPlaybook &&
  localContract &&
  sourceFacts.response.model !== localContract.model
) {
  console.error("Source-state interpreter model mismatch");
  process.exit(2);
}
const sourceExecution =
  args.gateway && interpretedPlaybook
    ? {
        execution: financeMode
          ? "finance-source-state-v3"
          : securityMode
            ? "security-source-state-v1"
            : "supplier-source-state-v1",
        model: sourceFacts.response.model,
        node: process.versions.node,
        architecture: process.arch,
      }
    : null;
const adapters =
  args.gateway && interpretedPlaybook
    ? await sourceStateAdapters()
    : args.gateway
      ? await gatewayAdapters()
      : mockAdapters();
const result = await runPlaybook(compilePlaybook(yaml), inputs, adapters);

console.log(
  JSON.stringify(
    {
      ...result,
      ...(sourceFacts ? { source_facts: sourceFacts } : {}),
      ...(workflowContext ? { workflow_context: workflowContext } : {}),
      ...(localEvidence ? { local_model_evidence: localEvidence } : {}),
      ...(sourceExecution
        ? {
            [financeMode
              ? "finance_execution"
              : securityMode
                ? "security_execution"
                : "supplier_execution"]: sourceExecution,
          }
        : {}),
    },
    null,
    2,
  ),
);
process.exitCode = result.status === "error" ? 2 : 0;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2),
      n = argv[i + 1];
    if (!n || n.startsWith("--")) out[k] = true;
    else {
      out[k] = n;
      i++;
    }
  }
  return out;
}

function mockAdapters() {
  return {
    invokeInstruction: async ({ prompt }) => `[mock-llm] ${prompt.slice(0, 80)}...`,
    invokeSkill: async ({ slug, inputs }) =>
      `[mock-skill:${slug}] ${JSON.stringify(inputs).slice(0, 80)}`,
    invokeTool: async ({ name, inputs }) =>
      /^(finance|supplier|security)\./.test(name) ? `[mock-tool] ${name}` : { name, inputs },
    onTelemetry: (e) => console.error(`[telemetry] ${JSON.stringify(e)}`),
  };
}

async function sourceStateAdapters() {
  const prepare = securityMode
    ? (await import(new URL("src/lib/runtime/security-stages.ts", ROOT_URL).href))
        .prepareSecurityStage
    : financeMode
      ? (await import(new URL("src/lib/runtime/finance-stages.ts", ROOT_URL).href))
          .prepareFinanceStage
      : (await import(new URL("src/lib/runtime/supplier-stages.ts", ROOT_URL).href))
          .prepareSupplierStage;
  return {
    invokeInstruction: async () => {
      throw new Error("Unexpected free-form source-state generation");
    },
    invokeSkill: async () => {
      throw new Error("Unexpected source-state delegation");
    },
    invokeTool: async ({ name, context }) => prepare(name, sourceFacts, context.steps),
    onTelemetry: (e) => console.error(`[telemetry] ${JSON.stringify(e)}`),
  };
}

async function gatewayAdapters() {
  const {
    AI_GATEWAY_BASE_URL,
    AI_GATEWAY_API_KEY,
    AI_GATEWAY_MODEL = "openai/gpt-4o-mini",
  } = process.env;
  if (!AI_GATEWAY_BASE_URL || !AI_GATEWAY_API_KEY) {
    console.error("AI_GATEWAY_BASE_URL and AI_GATEWAY_API_KEY required for --gateway");
    process.exit(1);
  }
  const chat = async (prompt, data, safetyResponse = "") => {
    const r = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_GATEWAY_MODEL,
        messages: buildGatewayMessages(prompt, data, safetyResponse, {
          slug: yaml.slug,
          name: yaml.name,
        }),
        temperature: 0,
        tools: [],
        tool_choice: "none",
        ...(localContract
          ? {
              max_tokens: localContract.max_tokens,
              chat_template_kwargs: { enable_thinking: false },
            }
          : {}),
      }),
    });
    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const j = await r.json();
    if (
      localContract &&
      (j.model !== AI_GATEWAY_MODEL ||
        !Number.isInteger(j.usage?.prompt_tokens) ||
        j.usage.prompt_tokens <= 0 ||
        !Number.isInteger(j.usage?.completion_tokens) ||
        j.usage.completion_tokens <= 0 ||
        j.usage.completion_tokens >= localContract.max_tokens)
    )
      throw new Error("Packaged response model or usage mismatch");
    const choice = j.choices?.[0];
    if (choice?.finish_reason !== "stop") throw new Error("gateway incomplete generation");
    const content = textOnlyContent(choice.message);
    return content;
  };
  return {
    invokeInstruction: ({ prompt, context }) =>
      chat(
        prompt,
        {
          inputs: workflowContext ? workflowContext.facts.original_sources : context.inputs,
          steps: context.steps,
          ...(sourceFacts ? { source_facts: sourceFacts.facts } : {}),
          ...(workflowContext ? { source_context: workflowContext.facts } : {}),
        },
        workflowContext?.facts.attachment_safety_response ?? "",
      ),
    invokeSkill: ({ slug, inputs, context }) =>
      chat(`Invoke skill ${slug}.`, { inputs, steps: context.steps }),
    onTelemetry: (e) => console.error(`[telemetry] ${JSON.stringify(e)}`),
  };
}
