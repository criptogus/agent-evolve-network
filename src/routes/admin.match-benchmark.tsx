import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { readMatchResult } from "@/lib/match/result-stream";
import { z } from "zod";
import {
  getBenchmarkReadiness,
  probeBenchmarkTransport,
  probeBenchmarkJev,
  generateBenchmarkObservation,
} from "@/lib/match/benchmark.functions";
import {
  BENCHMARK_PRIOR_HELD_USD,
  BENCHMARK_PRIOR_SPEND_UPPER_USD,
  requireBenchmarkPreview,
  reconcileBenchmarkBudget,
} from "@/lib/match/benchmark-budget";
const schema = z.object({
  planHash: z.literal("bb65012fa50678a5b216bf2725a160517553d1e77c5e35dd59572d9d09f401c3"),
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
});
const STORAGE = "sas-agent-match-paired-v12-usd5";
export const Route = createFileRoute("/admin/match-benchmark")({ component: Benchmark });
function Benchmark() {
  const generate = useServerFn(generateBenchmarkObservation);
  const readiness = useServerFn(getBenchmarkReadiness);
  const probe = useServerFn(probeBenchmarkTransport);
  const probeJev = useServerFn(probeBenchmarkJev);
  const [batch, setBatch] = useState<z.infer<typeof schema> | null>(null);
  const [message, setMessage] = useState(
    "Import the frozen synthetic batch. This preview-only runner never publishes.",
  );
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [billedUsd, setBilledUsd] = useState(0);
  const [billedObservations, setBilledObservations] = useState(0);
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
              reconciledBilledUsd: z.number(),
              rows: z.array(
                z.object({
                  caseId: z.string(),
                  repeat: z.number(),
                  arm: z.string(),
                  result: z.unknown(),
                  clientElapsedMs: z.number().positive().optional(),
                }),
              ),
            })
            .parse(JSON.parse(previous))
        : null;
      if (checkpoint && checkpoint.planHash !== batch.planHash) throw new Error("Changed plan");
      let remaining = reconcileBenchmarkBudget({
        billedUsd,
        billedObservations,
        completed: checkpoint?.rows.length ?? 0,
        previousBilledUsd: checkpoint?.reconciledBilledUsd ?? 0,
      });
      const rows: Array<{
        caseId: string;
        repeat: number;
        arm: string;
        result: unknown;
        clientElapsedMs?: number;
      }> = checkpoint?.rows ?? [];
      if (rows.length >= 72) throw new Error("Batch complete; export evidence");
      const persist = (status: string, inflight: unknown = null) => {
        const text = JSON.stringify(
          {
            planHash: batch.planHash,
            status,
            remainingProviderEquivalentUsd: remaining,
            limitUsd: 5,
            priorHeldUsd: BENCHMARK_PRIOR_HELD_USD,
            priorSpendUpperUsd: BENCHMARK_PRIOR_SPEND_UPPER_USD,
            billingReconciliationRequired: true,
            reconciledBilledUsd: billedUsd,
            reconciledBilledObservations: billedObservations,
            inflight,
            rows,
          },
          null,
          2,
        );
        localStorage.setItem(STORAGE, text);
        setReport(text);
      };
      if (
        batch.schedule.slice(rows.length, rows.length + 4).some((s) => s.arm === "jev") &&
        !checked.jevConfigured
      )
        throw new Error(
          "TYPESAFE_API_KEY is required for the next managed-backend Jev observation. No new inference started.",
        );
      persist("running");
      const batchEnd = Math.min(72, rows.length + 4);
      for (const step of batch.schedule.slice(rows.length, batchEnd)) {
        const item = batch.cases.find((c) => c.id === step.caseId);
        if (!item) throw new Error("Missing frozen case");
        // Actual qualification executes Jev in the same backend, never a locally
        // precomputed selection or additive cross-environment latency estimate.
        const candidates = batch.catalog;
        const attempt = `${batch.planHash.slice(0, 8)}:${step.caseId}:${step.repeat}:${step.arm}`;
        persist("inflight", { attempt, remaining });
        setMessage(`Running ${rows.length + 1}/72: ${attempt}`);
        const clientStarted = performance.now();
        const result = await readMatchResult(
          await generate({
            data: {
              attempt,
              brief: item.brief,
              candidates,
              arm: step.arm,
              catalogSize: 665,
              desired: batch.desired,
              remaining,
            },
          }),
        );
        rows.push({
          ...step,
          result,
          clientElapsedMs: Math.round(performance.now() - clientStarted),
        });
        if (result.status === "unknown" || result.providerEquivalentUsd === null) {
          remaining -= result.reservation.reserve;
          persist("stopped_unknown_usage", { attempt });
          throw new Error("Stopped: unknown billed usage; no retry");
        }
        // Keep the full worst-case reservation until this batch is reconciled.
        remaining -= result.reservation.reserve;
        persist("checkpoint");
        if (
          result.finishReason !== "stop" ||
          !result.parsed ||
          !result.clean ||
          !/^(?:openai\/)?gpt-5\.2(?:-|$)/.test(result.actualModel)
        ) {
          persist("stopped_invalid_output");
          throw new Error("Invalid or truncated output; no retry");
        }
        // At most four unique observations, with full reservations held until native reconciliation.
        if (rows.length < batchEnd) continue;
        persist(rows.length === 72 ? "completed" : "billing_checkpoint");
        setMessage(
          "Observation saved. Reconcile actual billed credits before continuing the finite batch.",
        );
        break;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Stopped; inspect journal";
      setMessage(
        message.length > 240 || /<(?:!doctype|html|script|body)/i.test(message)
          ? "Transport failed. Inflight attempt stays blocked; reconcile billing before any retry."
          : message,
      );
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
        This run’s billed USD upper bound, reconciled from native AI credits
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
        Native billing reconciled observation count
        <input
          type="number"
          min="0"
          max="72"
          step="1"
          value={billedObservations}
          onChange={(e) => setBilledObservations(Number(e.target.value))}
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
        Run next batch (up to 4 observations)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          try {
            const r = await readiness();
            setMessage(
              r.ready
                ? `Backend ready: authenticated admin and managed Lovable AI configured. TypeSafe configured: ${r.jevConfigured}. Mode: ${r.jevMode}. Zero inference calls.`
                : "Managed Lovable AI unavailable. Zero inference calls.",
            );
          } catch {
            setMessage("Backend preflight failed; zero inference calls.");
          }
        }}
      >
        Check backend readiness (no inference)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(
            "Testing 25-second streaming transport with a 144 KiB synthetic payload; zero inference.",
          );
          const started = performance.now();
          let phase = "opening";
          try {
            const stream = await probe();
            const firstResponseMs = Math.round(performance.now() - started);
            phase = "reading";
            const result = await readMatchResult(stream);
            const details = {
              firstResponseMs,
              clientElapsedMs: Math.round(performance.now() - started),
              serverElapsedMs: result.elapsedMs,
              payloadBytes: result.payload.length,
            };
            if (
              result.payload.length !== 147456 ||
              result.elapsedMs < 25000 ||
              details.clientElapsedMs < 25000
            ) {
              setMessage(
                `Transport delivered but validation failed: ${JSON.stringify(details)}; zero inference.`,
              );
              return;
            }
            setMessage(`Transport probe passed: ${JSON.stringify(details)}; zero inference.`);
          } catch {
            setMessage(`Transport probe failed during ${phase}; no inference started.`);
          } finally {
            setBusy(false);
          }
        }}
      >
        Test streaming transport (no inference)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await probeJev();
            setMessage(`Finite TypeSafe probe: ${JSON.stringify(result)}. No Lovable generation.`);
          } catch {
            setMessage("TypeSafe diagnostic failed; no automatic retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Test TypeSafe transport (one synthetic request)
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
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Download evidence
      </button>
    </main>
  );
}
