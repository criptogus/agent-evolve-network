# Solution playbook runtime qualification

The four standalone `solution-*` playbooks remain unqualified. Their solution
pages and the approval of 21 individual skills do not approve execution of these
compiled workflows. No production publication is authorized by this document.

The gateway CLI previously dropped `RunContext.inputs` and `RunContext.steps`.
The real CLI regression reproduced that omission and acceptance of both empty and
truncated outputs. The adapter now sends instruction text as a system message and
original inputs plus prior outputs as untrusted JSON data. It requires a nonempty
string with `finish_reason: stop` before the runtime can continue.

Run the reusable transport regression without model calls:

```sh
node --experimental-strip-types --test tests/playbook-gateway.test.ts
npm run check:project
```

The loopback server supplies fixture responses only. These results cannot approve
model behavior, injection resistance, calculated business answers or completion
of a workflow. A successful runtime status means its configured steps completed;
it is not controller approval, a signed document, posting, payment or deployment.

Next qualification must freeze the four actual YAML sources, compiled runtime and
gateway adapter hashes, case inputs, original numeric and severity gates, model
revision, installed SDKs and generation settings before inference. Execute every
instruction in the actual compiled graph with original sources and prior outputs.
Retain every raw step response, finish reason, actual model and usage; reject
errors, truncation, missing evidence and invented external actions. Review valid
business calculations and each source-injection and authority attack against the
frozen expectations. Do not repair evaluated responses or transfer approvals
from the individual skills. A pilot remains a pilot.

Use the existing cached 9B model only after verifying its recorded fingerprints.
Bind the server to loopback, disable downloads and live tools, and retain its
process and shutdown evidence. The old `redact-route-generate-v1` qualification
belongs to the individual skill runner; it does not cover this different graph.
Any successful new qualification must name its exact runtime/model scope and
immutable package version. Keep failed histories. Publish only via the existing
administrator and adversarial approval gates after complete evidence passes.
