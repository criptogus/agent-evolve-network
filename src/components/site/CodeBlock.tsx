import { useState } from "react";

export function CodeBlock({
  code,
  lang = "bash",
  filename,
}: {
  code: string;
  lang?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.16_0.01_270)] text-[13px] shadow-elevated">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.55_0.18_25)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.6_0.12_80)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.6_0.12_150)]" />
          <span className="ml-3 font-mono text-xs text-white/50">{filename ?? lang}</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="font-mono text-xs text-white/60 transition-colors hover:text-white"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono leading-relaxed text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
