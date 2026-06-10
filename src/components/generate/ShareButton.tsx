import { useState } from "react";

export function ShareButton({ prompt }: { prompt: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const disabled = !prompt.trim();

  async function handleShare() {
    if (disabled || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("prompt", prompt.trim());
    const shareUrl = url.toString();

    // Try Web Share API on mobile/supported browsers
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share && /Mobi|Android|iPhone|iPad/i.test(nav.userAgent)) {
      try {
        await nav.share({
          title: "Super Agent Skill — Live demo",
          text: `Watch this prompt forge an agent: "${prompt.trim()}"`,
          url: shareUrl,
        });
        setState("copied");
        setTimeout(() => setState("idle"), 1800);
        return;
      } catch {
        // user cancelled or share failed → fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      title={disabled ? "Type a prompt first" : "Copy a shareable link with this prompt"}
      aria-live="polite"
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 " +
        (state === "copied"
          ? "border-signal/40 bg-signal/10 text-signal-foreground"
          : state === "error"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-background hover:bg-accent")
      }
    >
      {state === "copied" ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Link copied
        </>
      ) : state === "error" ? (
        <>Copy failed</>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Share demo
        </>
      )}
    </button>
  );
}
