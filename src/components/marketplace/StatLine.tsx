import type { LucideIcon } from "lucide-react";

/**
 * Directory-style stat row: label on the left, dotted leader, value on the
 * right. Shared by the marketplace cards and the package details sidebar so
 * both surfaces read the same way.
 */
export function StatLine({
  icon: Icon,
  label,
  children,
  title,
}: {
  icon?: LucideIcon;
  label: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs" title={title}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span aria-hidden className="mt-1 flex-1 border-b border-dashed border-border" />
      <span className="shrink-0 font-mono text-[11px] text-foreground">{children}</span>
    </div>
  );
}
