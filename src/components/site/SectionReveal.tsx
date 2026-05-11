import { useEffect, useRef, useState, type ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article";
}

/** Reveals children once when scrolled into view. Honors prefers-reduced-motion. */
export function SectionReveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setTimeout(() => setShown(true), delay);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref as never}
      className={
        className +
        " transition-all duration-700 ease-out " +
        (shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")
      }
    >
      {children}
    </Tag>
  );
}
