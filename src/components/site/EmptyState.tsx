import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/**
 * Friendly empty state. Defaults to an Inbox glyph but accepts any
 * lucide icon. Optional CTA renders as a primary button or link.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  cta,
}: {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      {cta && (
        <a
          href={cta.href}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-95"
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}
