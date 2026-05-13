# Playbook Runtime

Compiles a YAML Playbook into an executable state machine. Skills, instructions
and tools become composable steps with conditional gating, retries, guardrail
middleware, anonymous telemetry, and an injectable memory store.

This is the core of the orchestration moat: skills in isolation are
commodities, but a stateful, guardrail-aware, observable runtime that composes
them into a deterministic workflow is not.

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

| Adapter             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `invokeSkill`       | `action: skill:<slug>` → SkillForge / MCP call    |
| `invokeInstruction` | `action: instruction` → bare LLM call             |
| `invokeTool`        | `action: tool:<name>` → integration (Phase 4)     |
| `guardrails`        | named pre/post middleware (PII, refusal, etc.)    |
| `memory`            | persistent key/value store (in-memory default)    |
| `tracer`            | OTel-compatible span/event sink                   |
| `onTelemetry`       | feeds `src/lib/trust/telemetry.ts`                |

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

## Local run

```bash
npm run playbook:run -- --playbook bug-triage --inputs '{"report":"x","repo_context":"node"}'
npm run playbook:run -- --playbook bug-triage --inputs-file ./i.json --gateway
```

The mock invoker prints a deterministic trace; `--gateway` proxies to the
configured AI gateway.
