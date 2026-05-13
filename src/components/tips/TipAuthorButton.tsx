import { useState } from "react";
import { Heart, Check } from "lucide-react";
import { toast } from "sonner";
import { createTipIntent } from "@/lib/growth/tips.functions";

const AMOUNTS: { value: number; recommended?: boolean }[] = [
  { value: 1 },
  { value: 5, recommended: true },
  { value: 25 },
];

export function TipAuthorButton({
  packageSlug,
  totalCents,
}: {
  packageSlug: string;
  totalCents?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  const tip = async (dollars: number) => {
    setBusy(dollars);
    try {
      const r = await createTipIntent({
        data: {
          package_slug: packageSlug,
          amount_cents: dollars * 100,
          message: message.trim() || undefined,
          source: "package_page",
        },
      });
      if (r.ok) {
        const ev = new CustomEvent("sas:tip-intent-created", {
          detail: { intent_id: r.intent_id, amount_cents: r.amount_cents },
        });
        window.dispatchEvent(ev);
        setConfirmed(true);
        toast.success("Opening payment…");
        setTimeout(() => {
          setOpen(false);
          setConfirmed(false);
          setMessage("");
        }, 1200);
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Tip failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
      >
        <Heart className="h-3.5 w-3.5 text-rose-500" strokeWidth={2} aria-hidden />
        Tip author
        {typeof totalCents === "number" && totalCents > 0 && (
          <span className="text-muted-foreground">
            · ${(totalCents / 100).toLocaleString()} tipped
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tip the author"
          className="mt-2 w-80 rounded-xl border border-border bg-background p-4 shadow-elevated"
        >
          {confirmed ? (
            <div className="flex flex-col items-center py-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <p className="mt-3 text-sm font-medium">Thanks — opening payment</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                100% goes to the author. No platform fee.
              </p>
              <textarea
                className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm"
                rows={2}
                maxLength={280}
                placeholder="Optional note (≤ 280 chars)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => tip(a.value)}
                    className={
                      "relative flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors disabled:opacity-50 " +
                      (a.recommended
                        ? "border-primary bg-primary/5 text-foreground hover:bg-primary/10"
                        : "border-border hover:bg-accent")
                    }
                  >
                    {busy === a.value ? "…" : `$${a.value}`}
                    {a.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">
                        Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
