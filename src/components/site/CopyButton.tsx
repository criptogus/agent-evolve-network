import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  shortLabel?: string;
  className?: string;
}

export function CopyButton({ value, label = "copy", shortLabel, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      className={
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground " +
        (copied ? "border-signal/40 bg-signal/10 text-signal " : "") +
        className
      }
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span className={shortLabel ? "hidden sm:inline" : undefined}>{copied ? "Copied" : label}</span>
      {shortLabel && <span className="sm:hidden">{copied ? "Copied" : shortLabel}</span>}
    </button>
  );
}

interface CodeBlockCopyProps {
  code: string;
  label?: string;
  className?: string;
}

export function CodeBlockCopy({ code, label, className = "" }: CodeBlockCopyProps) {
  return (
    <div
      className={
        "group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-[oklch(0.14_0.01_270)] px-3 py-3 font-mono text-[12px] text-white/90 shadow-elevated sm:gap-3 sm:px-4 sm:text-[13px] " +
        className
      }
    >
      <span className="text-primary">$</span>
      <code className="min-w-0 flex-1 truncate">{code}</code>
      <CopyButton value={code} label={label ?? "copy"} shortLabel="copy" className="shrink-0 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white" />
    </div>
  );
}
