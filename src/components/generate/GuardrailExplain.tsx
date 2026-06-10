import type { Governance } from "@/lib/generate/types";
import { GOVERNANCE } from "@/lib/generate/types";
import { explainGuardrail } from "@/lib/generate/guardrails";

export function GuardrailExplain({ name, level }: { name: string; level: Governance }) {
  const blurb = explainGuardrail(name);
  return (
    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Why this is safe
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{blurb}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        Enforcement under <span className="text-foreground">{GOVERNANCE[level].label}</span>:{" "}
        {level === "lockdown"
          ? "block + human review + audit log."
          : level === "strict"
            ? "block + dual-LLM judge confirmation."
            : "redact or refuse with reason."}
      </p>
    </div>
  );
}
