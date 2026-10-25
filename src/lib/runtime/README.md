# Playbook Runtime

Compiles a YAML Playbook into an executable state machine. Skills, instructions
and tools become composable steps with conditional gating, retries, guardrail
middleware, anonymous telemetry, and an injectable memory store.

## Building blocks

```
content/playbooks/<slug>.yaml
        │
        ▼
compilePlaybook(yaml)  → CompiledPlaybook
        │
        ▼
runPlaybook(compiled, inputs, adapters) → RunResult
```

### `RuntimeAdapters`

| Adapter             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `invokeSkill`       | `action: skill:<slug>` → SkillForge / MCP call |
| `invokeInstruction` | `action: instruction` → bare LLM call          |
| `invokeTool`        | `action: tool:<name>` → integration (Phase 4)  |
| `guardrails`        | named pre/post middleware (PII, refusal, etc.) |
| `memory`            | persistent key/value store (in-memory default) |
| `tracer`            | OTel-compatible span/event sink                |
| `onTelemetry`       | feeds `src/lib/trust/telemetry.ts`             |

### Expression grammar (`when` clauses)

```
${inputs.foo} contains 'bar'
${steps.x.output} == 'critical' && ${steps.y.status} == 'ok'
!${inputs.dry_run}
```

`${...}` resolves a path from `inputs`, `steps.<id>.{output,status}` or
`metadata`. Operators: `==`, `!=`, `contains`, `&&`, `||`, `!`, `()`. No
arbitrary JS — the parser rejects anything outside this grammar.

## Step semantics

- `on_error: abort` (default) — stop the run, status `error`
- `on_error: continue` — record the failure and proceed, status `partial`
- `on_error: retry` — re-invoke up to `retry.max + 1` times with linear backoff

Guardrails run twice per step (`pre` / `post`). A failed guardrail short-circuits
the step and is recorded in `guardrails_triggered` and forwarded to telemetry.
Unavailable configured guards fail closed; their absence never means approval.
Guard exceptions become fixed failure reasons without exposing exception details.
Blocked post-guard output is excluded from the returned outputs and from subsequent
step context, including `on_error: continue` flows.

The built-in `no-pii-in-output` guard uses the existing leak scanner's documented
identifier/credential patterns. Additional guard names require a real host adapter.
The scanner is not a universal privacy detector, and this output guard does not
claim to redact inputs before they reach a provider.

## Local run

```bash
npm run playbook:run -- --playbook bug-triage --inputs '{"report":"x","repo_context":"node"}'
npm run playbook:run -- --playbook bug-triage --inputs-file ./i.json --gateway
```

The mock invoker prints a deterministic trace; `--gateway` proxies to the
configured AI gateway.

For compiled solution-graph qualification, use
[`docs/PLAYBOOK-RUNTIME-QUALIFICATION.md`](../../../docs/PLAYBOOK-RUNTIME-QUALIFICATION.md).
A completed instruction sequence is not evidence of external test execution,
payment, posting, signing or owner approval. Mock responses never qualify a model.
