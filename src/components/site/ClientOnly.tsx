import { useEffect, useRef, useState, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  /** Min-height fallback shown during SSR and before the section becomes visible. Avoids layout shift. */
  minHeight?: number | string;
  /** If true, mounts immediately on hydrate instead of waiting for visibility. */
  eager?: boolean;
  className?: string;
}

/**
 * Renders nothing on SSR (only the placeholder), and mounts children on the
 * client either eagerly after hydrate (eager=true) or when the placeholder
 * scrolls within ~600px of the viewport. Use this around heavy, decorative
 * sections that don't need to be in the SSR HTML for SEO.
 */
export function ClientOnly({ children, minHeight = 400, eager = false, className }: ClientOnlyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (eager) {
      setMounted(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [eager]);

  return (
    <div
      ref={ref}
      className={className}
      style={mounted ? undefined : { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
    >
      {mounted ? children : null}
    </div>
  );
}
