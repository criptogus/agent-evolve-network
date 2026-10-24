import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import {
  getBenchmarkReadiness,
  generateBenchmarkObservation,
} from "@/lib/match/benchmark.functions";
import { requireBenchmarkPreview } from "@/lib/match/benchmark-budget";
const schema = z.object({
  planHash: z.literal("f498ccf75aa603842123013543aba73a885fd07383068a1fc944aeac0dae7bbf"),
  catalog: z
    .array(
      z.object({
        slug: z.string(),
        name: z.string(),
        type: z.enum(["skill", "playbook", "soul", "guardrail"]),
        description: z.string(),
      }),
    )
    .length(665),
  desired: z.object({
    skills: z.literal(5),
    playbooks: z.literal(2),
    souls: z.literal(1),
    guardrails: z.literal(2),
  }),
  cases: z.array(z.object({ id: z.string(), brief: z.string() })).length(12),
  schedule: z
    .array(
      z.object({
        caseId: z.string(),
        repeat: z.number().int().min(0).max(2),
        arm: z.enum(["baseline", "jev"]),
      }),
    )
    .length(72),
  selections: z
    .array(
      z.object({
        caseId: z.string(),
        repeat: z.number(),
        slugs: z.array(z.string()).min(1),
        trace: z.record(z.string(), z.unknown()),
      }),
    )
    .length(36),
});
const STORAGE = "sas-agent-match-paired-v2-usd5";
export const Route = createFileRoute("/admin/match-benchmark")({ component: Benchmark });
function Benchmark() {
  const generate = useServerFn(generateBenchmarkObservation);
  const readiness = useServerFn(getBenchmarkReadiness);
  const [batch, setBatch] = useState<z.infer<typeof schema> | null>(null);
  const [message, setMessage] = useState(
    "Import the frozen synthetic batch. This preview-only runner never publishes.",
  );
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [billedUsd, setBilledUsd] = useState(0);
  async function run() {
    if (!batch || busy) return;
    setBusy(true);
    try {
      requireBenchmarkPreview(window.location.href);
      const checked = await readiness();
      if (!checked.ready)
        throw new Error("Managed Lovable AI is not configured; zero inference calls started");
      const previous = localStorage.getItem(STORAGE);
      const checkpoint = previous
        ? z
            .object({
              planHash: z.string(),
              status: z.enum(["billing_checkpoint", "completed"]),
              inflight: z.null(),
              remainingProviderEquivalentUsd: z.number(),
              rows: z.array(
                z.object({
                  caseId: z.string(),
                  repeat: z.number(),
                  arm: z.string(),
                  result: z.unknown(),
                }),
              ),
            })
            .parse(JSON.parse(previous))
        : null;
      if (checkpoint && checkpoint.planHash !== batch.planHash) throw new Error("Changed plan");
      let remaining = Math.min(checkpoint?.remainingProviderEquivalentUsd ?? 5, 5 - billedUsd);
      const rows: Array<{ caseId: string; repeat: number; arm: string; result: unknown }> =
        checkpoint?.rows ?? [];
      if (rows.length >= 72) throw new Error("Batch complete; export evidence");
      const persist = (status: string, inflight: unknown = null) => {
        const text = JSON.stringify(
          {
            planHash: batch.planHash,
            status,
            remainingProviderEquivalentUsd: remaining,
            limitUsd: 5,
            billingReconciliationRequired: true,
            reconciledBilledUsd: billedUsd,
            inflight,
            rows,
          },
          null,
          2,
        );
        localStorage.setItem(STORAGE, text);
        setReport(text);
      };
      persist("running");
      for (const step of batch.schedule.slice(rows.length)) {
        const item = batch.cases.find((c) => c.id === step.caseId);
        const selection = batch.selections.find(
          (s) => s.caseId === step.caseId && s.repeat === step.repeat,
        );
        if (!item || !selection) throw new Error("Missing frozen case/selection");
        const candidates =
          step.arm === "baseline"
            ? batch.catalog
            : batch.catalog.filter((c) => selection.slugs.includes(c.slug));
        const attempt = `${step.caseId}:${step.repeat}:${step.arm}`;
        persist("inflight", { attempt, remaining });
        setMessage(`Running ${rows.length + 1}/72: ${attempt}`);
        const result = await generate({
          data: {
            attempt,
            brief: item.brief,
            candidates,
            catalogSize: 665,
            desired: batch.desired,
            remaining,
          },
        });
        rows.push({ ...step, result });
        if (result.status === "unknown" || result.providerEquivalentUsd === null) {
          persist("stopped_unknown_usage", { attempt });
          throw new Error("Stopped: unknown billed usage; no retry");
        }
        remaining -= result.providerEquivalentUsd;
        persist("checkpoint");
        if (result.finishReason !== "stop" || !result.parsed || !result.clean) {
          persist("stopped_invalid_output");
          throw new Error("Invalid or truncated output; no retry");
        }
        // One observation per click: reconcile the actual Lovable credits before continuing.
        persist(rows.length === 72 ? "completed" : "billing_checkpoint");
        setMessage(
          "Observation saved. Reconcile actual billed credits before continuing the finite batch.",
        );
        break;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Stopped; inspect journal");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Agent Match — private paired evaluation</h1>
      <p>
        12 frozen cases × 3 repeats × 2 arms. USD 5 total authorization. No automatic retries or
        publication.
      </p>
      <label className="block">
        Cumulative billed USD, reconciled from Lovable AI credits
        <input
          type="number"
          min="0"
          max="5"
          step="0.0001"
          value={billedUsd}
          onChange={(e) => setBilledUsd(Number(e.target.value))}
        />
      </label>
      <label className="block">
        Synthetic batch JSON
        <input
          className="block"
          type="file"
          accept="application/json"
          disabled={busy}
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f || f.size > 2000000) throw new Error("Missing or oversized batch");
              setBatch(schema.parse(JSON.parse(await f.text())));
              setMessage("Frozen batch loaded; no inference started.");
              setReport(localStorage.getItem(STORAGE) ?? "");
            } catch {
              setMessage("Invalid batch");
            }
          }}
        />
      </label>
      <button className="border rounded p-2" disabled={!batch || busy} onClick={run}>
        Run next observation
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          try {
            const r = await readiness();
            setMessage(
              r.ready
                ? "Backend ready: authenticated admin and managed Lovable AI configured. Zero inference calls."
                : "Managed Lovable AI unavailable. Zero inference calls.",
            );
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Backend preflight failed; zero inference calls.",
            );
          }
        }}
      >
        Check backend readiness (no inference)
      </button>
      <p role="status">{message}</p>
      <label className="block">
        Evidence journal
        <textarea className="block w-full h-60 border" readOnly value={report} />
      </label>
      <button
        className="border rounded p-2"
        onClick={() => {
          const text = localStorage.getItem(STORAGE);
          if (!text) {
            setMessage("No evidence to export");
            return;
          }
          const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "agent-match-observations.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download evidence
      </button>
    </main>
  );
}
