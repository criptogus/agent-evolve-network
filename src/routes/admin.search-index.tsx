import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { semanticIndexStatus, indexSemanticBatch } from "@/lib/search/indexing.functions";
import { IndexReceipt, parseIndexJournal } from "@/lib/search/index-contract";
import { readIndexJournal, writeIndexJournal } from "@/lib/search/index-journal";
export const Route = createFileRoute("/admin/search-index")({ component: SearchIndex });
const STORAGE = "sas-managed-semantic-index-v1";
function SearchIndex() {
  const statusFn = useServerFn(semanticIndexStatus),
    indexFn = useServerFn(indexSemanticBatch);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof statusFn>> | null>(null);
  const [maximum, setMaximum] = useState(1),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState(
      "Refresh status before indexing. Only approved public package metadata is sent to the configured provider.",
    ),
    [journal, setJournal] = useState("");
  async function refresh() {
    const raw = await readIndexJournal(STORAGE);
    let parsed = parseIndexJournal(raw);
    const next = await statusFn({
      data: { requestId: parsed?.status === "inflight" ? parsed.requestId : undefined },
    });
    if (parsed?.status === "inflight" && next.attempt?.status === "completed") {
      const receipt = IndexReceipt.parse(next.attempt.receipt);
      if (receipt.requestId !== parsed.requestId || receipt.model !== parsed.model)
        throw new Error("Index attempt receipt mismatch; stop without retry");
      const checkpoint = {
        status: "checkpoint" as const,
        model: parsed.model,
        receipts: [...parsed.receipts, receipt],
      };
      await writeIndexJournal(STORAGE, JSON.stringify(checkpoint, null, 2));
      parsed = checkpoint;
    }
    setStatus(next);
    if (parsed) setJournal(JSON.stringify(parsed, null, 2));
    setBlocked(next.inflight || parsed?.status === "inflight");
    return next;
  }
  async function run() {
    if (
      busy ||
      !consent ||
      !status?.configured ||
      !status.model ||
      !Number.isInteger(maximum) ||
      maximum < 1 ||
      maximum > 25
    )
      return;
    setBusy(true);
    try {
      const current = await refresh();
      if (!current.configured || !current.model || current.ready || current.inflight)
        throw new Error("Complete or unresolved index; no new request started");
      const parsed = parseIndexJournal(await readIndexJournal(STORAGE));
      if (parsed?.status === "inflight")
        throw new Error("Previous request requires reconciliation; no retry");
      if (parsed && parsed.model !== current.model)
        throw new Error("Index profile changed; use a separate reviewed run");
      const requestId = crypto.randomUUID();
      const inflight = JSON.stringify(
        {
          status: "inflight",
          model: current.model,
          requestId,
          maximumPackages: maximum,
          receipts: parsed?.receipts ?? [],
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      );
      await writeIndexJournal(`${STORAGE}:${requestId}:inflight`, inflight);
      await writeIndexJournal(STORAGE, inflight);
      setJournal(inflight);
      setBlocked(true);
      setMessage("Index request in progress; no automatic retries.");
      const receipt = IndexReceipt.parse(
        await indexFn({
          data: { maximumPackages: maximum, requestId, expectedModel: current.model },
        }),
      );
      await writeIndexJournal(`${STORAGE}:${requestId}:receipt`, JSON.stringify(receipt));
      const checkpoint = JSON.stringify(
        {
          status: "checkpoint",
          model: current.model,
          receipts: [...(parsed?.receipts ?? []), receipt],
        },
        null,
        2,
      );
      await writeIndexJournal(STORAGE, checkpoint);
      setJournal(checkpoint);
      setBlocked(false);
      await refresh();
      setMessage(
        `Batch indexed: ${receipt.indexed}; provider requests: ${receipt.providerRequests}; dimensions: ${receipt.dimensions}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Index request failed; reconcile before any retry",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Semantic search index</h1>
      <p>
        Uses the server-managed Lovable credential. No key is copied into this page. Search requires
        a complete current index, sign-in and query consent; it keeps the existing daily allowance.
      </p>
      <button
        className="border rounded p-2"
        disabled={busy}
        onClick={async () => {
          try {
            await refresh();
            setMessage("Index status refreshed; no provider calls.");
          } catch {
            setMessage("Index status unavailable; no provider calls.");
          }
        }}
      >
        Refresh index status
      </button>
      {status && (
        <pre aria-label="Index status" className="text-xs whitespace-pre-wrap">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
      <label className="block">
        Maximum packages in next request
        <input
          className="block border rounded p-2"
          type="number"
          min={1}
          max={25}
          value={maximum}
          disabled={busy}
          onChange={(e) => setMaximum(Number(e.target.value))}
        />
      </label>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Index approved public metadata with the configured provider; charges may apply.
      </label>
      <button
        className="border rounded p-2"
        disabled={
          busy ||
          blocked ||
          !consent ||
          !status?.configured ||
          status.ready ||
          status.eligible > 2000
        }
        onClick={run}
      >
        Index next batch
      </button>
      <p role="status">{message}</p>
      {status?.ready && (
        <p>
          Current index is complete. Search is available unless the environment kill switch is set
          to false.
        </p>
      )}
      {blocked && (
        <p>
          A previous request is unresolved. Its durable record is retained; do not replay it
          automatically.
        </p>
      )}
      <label className="block">
        Index evidence journal
        <textarea
          className="block w-full h-60 border rounded p-2 font-mono text-xs"
          readOnly
          value={journal}
        />
      </label>
    </main>
  );
}
