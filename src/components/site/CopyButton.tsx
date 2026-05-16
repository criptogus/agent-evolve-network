import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  onCopy?: () => void;
}

export function CopyButton({ value, label = "copy", className = "", onCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          onCopy?.();
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
      {copied ? "Copied" : label}
    </button>
  );
}

interface CodeBlockCopyProps {
  code: string;
  label?: string;
  className?: string;
  onCopy?: () => void;
}

export function CodeBlockCopy({ code, label, className = "", onCopy }: CodeBlockCopyProps) {
  return (
    <div
      className={
        "group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-[oklch(0.14_0.01_270)] px-4 py-3 font-mono text-[13px] text-white/90 shadow-elevated " +
        className
      }
    >
      <span className="text-primary">$</span>
      <code className="flex-1 overflow-x-auto whitespace-nowrap">{code}</code>
      <CopyButton
        value={code}
        label={label ?? "copy"}
        onCopy={onCopy}
        className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
      />
    </div>
  );
}
