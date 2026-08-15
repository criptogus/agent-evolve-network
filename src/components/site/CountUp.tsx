import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Animates from 0 → `to` once, as soon as the element is on screen (or after a
 * short grace period, so counters that are already in the viewport at hydration
 * never get stuck at zero). Respects prefers-reduced-motion.
 */
export function CountUp({
  to,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    let done = false;
    let raf = 0;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const start = () => {
      if (done) return;
      done = true;
      if (reduced) {
        setValue(to);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        // ease-out-quart
        setValue((1 - Math.pow(1 - p, 4)) * to);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const node = ref.current;
    let io: IntersectionObserver | undefined;
    if (node && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            io?.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      io.observe(node);
    }

    // Safety net for nodes already visible at hydration time.
    const fallback = window.setTimeout(start, 700);

    return () => {
      window.clearTimeout(fallback);
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [to, duration]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
