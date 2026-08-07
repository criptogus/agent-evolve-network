import { PROJECT_TYPES, type ProjectType } from "@/lib/marketplace/project-profile";
import { X } from "lucide-react";

/**
 * One-question onboarding: what are you building? Used to rank packages by
 * project fit instead of by niche stack keywords.
 */
export function ProjectTypePicker({
  value,
  onChange,
  onDismiss,
  compact,
}: {
  value: ProjectType | null;
  onChange: (next: ProjectType | null) => void;
  onDismiss?: () => void;
  /** Row of pills only, without the question framing. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Building
        </span>
        {PROJECT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(value === t.value ? null : t.value)}
            aria-pressed={value === t.value}
            title={t.description}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              value === t.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-5">
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Skip this question"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Step 1 of 1</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">What are you building?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We use this to rank packages by fit for your project — no niche stack knowledge needed. You
        can change it any time.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PROJECT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            aria-pressed={value === t.value}
            className={`rounded-lg border p-3 text-left transition-colors ${
              value === t.value
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <span className="block text-sm font-medium">{t.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
