import { useState } from "react";
import { toast } from "sonner";
import { createTipIntent } from "@/lib/growth/tips.functions";

const AMOUNTS = [1, 5, 25];

export function TipAuthorButton({ packageSlug, totalCents }: { packageSlug: string; totalCents?: number | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const tip = async (dollars: number) => {
    setBusy(true);
    try {
      const r = await createTipIntent({
        data: { package_slug: packageSlug, amount_cents: dollars * 100, message: message.trim() || undefined, source: "package_page" },
      });
      if (r.ok) {
        // The Stripe.js handler this app already vends picks up intent_id and renders Payment Element.
        const ev = new CustomEvent("sas:tip-intent-created", { detail: { intent_id: r.intent_id, amount_cents: r.amount_cents } });
        window.dispatchEvent(ev);
        toast.success("Opening payment…");
        setOpen(false);
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Tip failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 border rounded px-3 py-1 text-sm hover:bg-accent"
      >
        <span>❤️</span> Tip author
        {typeof totalCents === "number" && totalCents > 0 && (
          <span className="text-muted-foreground">· ${(totalCents / 100).toLocaleString()} tipped</span>
        )}
      </button>

      {open && (
        <div className="mt-2 border rounded p-3 bg-background shadow-sm w-72">
          <p className="text-xs text-muted-foreground mb-2">
            100% goes to the author. No platform fee.
          </p>
          <textarea
            className="w-full text-sm border rounded p-2 mb-2"
            rows={2}
            maxLength={280}
            placeholder="Optional note (≤ 280 chars)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            {AMOUNTS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={busy}
                onClick={() => tip(d)}
                className="flex-1 border rounded py-1 text-sm hover:bg-accent disabled:opacity-50"
              >
                ${d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
