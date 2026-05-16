/**
 * Inline feedback prompt shown after an enrichment action (author / evaluate /
 * autolearn / forge-loop). Submits to the `submitPackageFeedback` server fn,
 * which calls the `submit_package_feedback` SECURITY DEFINER RPC.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitPackageFeedback } from "@/lib/skills/feedback.functions";

type FeedbackRequestLike = {
  id: string;
  prompt?: string;
};

export function FeedbackPrompt({
  request,
  compact = false,
}: {
  request: FeedbackRequestLike | null | undefined;
  compact?: boolean;
}) {
  const submit = useServerFn(submitPackageFeedback);
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!request?.id) return null;
  if (state === "done") {
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
        ✓ Thanks for the feedback — it improves the forge loop for everyone.
      </div>
    );
  }

  const send = async () => {
    if (!rating) return;
    setState("saving");
    setErr(null);
    try {
      const sentiment = rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";
      await submit({
        data: {
          request_id: request.id,
          rating,
          sentiment,
          comments: comments.trim() || undefined,
        },
      });
      setState("done");
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  return (
    <div className={`rounded-md border border-border bg-surface p-3 ${compact ? "space-y-2" : "space-y-3"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{request.prompt ?? "How did this turn out?"}</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-7 w-7 rounded text-sm transition ${
                rating !== null && n <= rating
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-background"
              }`}
              aria-label={`Rate ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {!compact && (
        <Textarea
          rows={2}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="What worked, what didn't? (optional)"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {rating ? `Rated ${rating}/5` : "Pick a score to enable submit"}
        </span>
        <Button size="sm" disabled={!rating || state === "saving"} onClick={send}>
          {state === "saving" ? "Sending…" : "Send feedback"}
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
