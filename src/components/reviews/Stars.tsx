import { useMemo, useState } from "react";

export function Stars({
  value,
  size = 14,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={`relative inline-block leading-none ${className}`}
      style={{ fontSize: size, width: size * 5.4 }}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      <span className="text-muted-foreground/30">★★★★★</span>
      <span
        className="absolute left-0 top-0 overflow-hidden text-amber-500"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={`leading-none transition-transform hover:scale-110 ${
            n <= display ? "text-amber-500" : "text-muted-foreground/40"
          }`}
          style={{ fontSize: size }}
          aria-label={`Rate ${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function RatingPill({
  avg,
  count,
  className = "",
}: {
  avg: number;
  count: number;
  className?: string;
}) {
  if (!count) {
    return (
      <span className={`text-[11px] text-muted-foreground ${className}`}>No ratings yet</span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground ${className}`}>
      <Stars value={avg} size={11} />
      <span className="font-mono text-foreground">{avg.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}

export function useStarColor(n: number) {
  return useMemo(() => (n >= 4 ? "text-emerald-500" : n >= 3 ? "text-amber-500" : "text-rose-500"), [n]);
}
