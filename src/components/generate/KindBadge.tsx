import type { Kind } from "@/lib/generate/types";

export function KindBadge({ kind }: { kind: Kind }) {
  const map: Record<Kind, { label: string; cls: string }> = {
    skill: { label: "SKILL", cls: "bg-primary/10 text-primary" },
    playbook: { label: "PLAYBOOK", cls: "bg-signal/20 text-signal-foreground" },
    soul: { label: "SOUL", cls: "bg-accent text-accent-foreground" },
    guardrail: { label: "GUARDRAIL", cls: "bg-destructive/10 text-destructive" },
  };
  const v = map[kind];
  return (
    <span
      className={"rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider " + v.cls}
    >
      {v.label}
    </span>
  );
}
