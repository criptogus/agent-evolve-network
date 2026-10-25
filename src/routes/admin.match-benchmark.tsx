import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { readMatchResult } from "@/lib/match/result-stream";
import { z } from "zod";
import { readBenchmarkJournal, writeBenchmarkJournal } from "@/lib/match/benchmark-journal";
import {
  getBenchmarkReadiness,
  probeBenchmarkTransport,
  probeBenchmarkJev,
  generateBenchmarkObservation,
} from "@/lib/match/benchmark.functions";
import {
  BENCHMARK_USD_LIMIT,
  BENCHMARK_PRIOR_HELD_USD,
  BENCHMARK_PRIOR_SPEND_UPPER_USD,
  requireBenchmarkPreview,
  isClosedBenchmarkCohort,
  reconcileBenchmarkBudget,
} from "@/lib/match/benchmark-budget";
const schema = z.object({
  planHash: z.literal("b42da3942496ca2f1ff81bb67dcda2e5493ede7a1ca986a843cd33aa3e97ff2f"),
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
const STORAGE = "sas-agent-match-paired-v33-usd20";
export const Route = createFileRoute("/admin/match-benchmark")({ component: Benchmark });
function Benchmark() {
  const generate = useServerFn(generateBenchmarkObservation);
  const readiness = useServerFn(getBenchmarkReadiness);
  const [cachePreflights, setCachePreflights] = useState<Awaited<ReturnType<typeof readiness>>[]>(
    [],
  );
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
  const [batchLimit, setBatchLimit] = useState(4);
  async function run() {
    if (!batch || busy) return;
    if (isClosedBenchmarkCohort(batch.planHash)) {
      setMessage(
        "Rejected cohort is closed. Only diagnostics are available; no inference started.",
      );
      return;
    }
    setBusy(true);
    try {
      requireBenchmarkPreview(window.location.href);
      if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 4)
        throw new Error("Batch limit must be 1–4");
      const checked = await readiness();
      if (!checked.ready)
        throw new Error("Managed Lovable AI is not configured; zero inference calls started");
      const previous = await readBenchmarkJournal(STORAGE);
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
      const persist = async (status: string, inflight: unknown = null) => {
        const text = JSON.stringify(
          {
            planHash: batch.planHash,
            status,
            remainingProviderEquivalentUsd: remaining,
            limitUsd: BENCHMARK_USD_LIMIT,
            priorHeldUsd: BENCHMARK_PRIOR_HELD_USD,
            priorSpendUpperUsd: BENCHMARK_PRIOR_SPEND_UPPER_USD,
            billingReconciliationRequired: true,
            reconciledBilledUsd: billedUsd,
            reconciledBilledObservations: billedObservations,
            maximumBatchObservations: batchLimit,
            inflight,
            rows,
          },
          null,
          2,
        );
        await writeBenchmarkJournal(STORAGE, text);
        setReport(text);
      };
      if (
        batch.schedule.slice(rows.length, rows.length + batchLimit).some((s) => s.arm === "jev") &&
        !checked.jevConfigured
      )
        throw new Error(
          "TYPESAFE_API_KEY is required for the next managed-backend Jev observation. No new inference started.",
        );
      await persist("running");
      const batchEnd = Math.min(72, rows.length + batchLimit);
      for (const step of batch.schedule.slice(rows.length, batchEnd)) {
        const item = batch.cases.find((c) => c.id === step.caseId);
        if (!item) throw new Error("Missing frozen case");
        // Actual qualification executes Jev in the same backend, never a locally
        // precomputed selection or additive cross-environment latency estimate.
        const candidates = batch.catalog;
        const attempt = `${batch.planHash.slice(0, 8)}:${step.caseId}:${step.repeat}:${step.arm}`;
        await persist("inflight", { attempt, remaining });
        setMessage(`Running ${rows.length + 1}/72: ${attempt}`);
        const clientStarted = performance.now();
        const result = await readMatchResult(
          generate({
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
          await persist("stopped_unknown_usage", { attempt });
          throw new Error("Stopped: unknown billed usage; no retry");
        }
        // Keep the full worst-case reservation until this batch is reconciled.
        remaining -= result.reservation.reserve;
        await persist("checkpoint");
        if (
          result.finishReason !== "stop" ||
          !result.parsed ||
          !result.clean ||
          !/^(?:openai\/)?gpt-5\.2(?:-|$)/.test(result.actualModel)
        ) {
          await persist("stopped_invalid_output");
          throw new Error("Invalid or truncated output; no retry");
        }
        // At most four unique observations, with full reservations held until native reconciliation.
        if (rows.length < batchEnd) continue;
        await persist(rows.length === 72 ? "completed" : "billing_checkpoint");
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
        12 frozen cases × 3 repeats × 2 arms. USD {BENCHMARK_USD_LIMIT} total authorization. No
        automatic retries or publication.
      </p>
      <label className="block">
        This run’s billed USD upper bound, reconciled from native AI credits
        <input
          type="number"
          min="0"
          max={BENCHMARK_USD_LIMIT}
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
        Maximum observations in next batch
        <input
          type="number"
          min="1"
          max="4"
          step="1"
          value={batchLimit}
          disabled={busy}
          onChange={(e) => setBatchLimit(Number(e.target.value))}
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
              setReport((await readBenchmarkJournal(STORAGE)) ?? "");
            } catch {
              setMessage("Invalid batch");
            }
          }}
        />
      </label>
      <p>V30 is rejected and closed. Use a new frozen comparison for any future generation.</p>
      <button
        className="border rounded p-2"
        disabled={!batch || busy || isClosedBenchmarkCohort(batch.planHash)}
        onClick={run}
      >
        Run next batch (up to 4 observations)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          try {
            const r = await readiness();
            setCachePreflights((previous) => [...previous.slice(-2), r]);
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
      {cachePreflights.length > 0 && (
        <label className="block">
          Cache continuity preflight (last three reads; no inference)
          <textarea
            className="block w-full border rounded p-2 font-mono text-xs"
            aria-label="Cache continuity preflight"
            readOnly
            rows={12}
            value={JSON.stringify(cachePreflights, null, 2)}
          />
        </label>
      )}
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
        Test TypeSafe transport (up to one synthetic request)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const text = "synthetic-evidence".repeat(393216);
            const key = `${STORAGE}:storage-probe`;
            await writeBenchmarkJournal(key, text);
            const actual = await readBenchmarkJournal(key);
            if (actual !== text) throw new Error("Journal mismatch");
            setMessage(
              `Durable journal probe passed: ${text.length} characters committed and read back exactly; zero inference.`,
            );
          } catch {
            setMessage("Durable journal probe failed; do not start inference.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Test durable journal (no inference)
      </button>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const started = performance.now();
          try {
            await readMatchResult(probe(), { timeoutMs: 250 });
            setMessage(
              "Client deadline probe failed: unexpected completed result; zero inference.",
            );
          } catch (error) {
            const elapsedMs = Math.round(performance.now() - started);
            setMessage(
              error instanceof Error &&
                /client deadline exceeded/.test(error.message) &&
                elapsedMs < 2000
                ? `Client deadline probe passed: ${elapsedMs} ms; opening/read canceled without waiting for remote cleanup; zero inference.`
                : "Client deadline probe failed; zero inference.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Test client deadline (no inference)
      </button>
      <p role="status">{message}</p>
      <label className="block">
        Evidence journal
        <textarea className="block w-full h-60 border" readOnly value={report} />
      </label>
      <button
        className="border rounded p-2"
        onClick={async () => {
          const text = await readBenchmarkJournal(STORAGE);
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
