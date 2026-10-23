import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Mode = "light" | "dark";

function readMode(): Mode {
  if (typeof document === "undefined") return "light";
  const stored = localStorage.getItem("sas-theme");
  if (stored === "light" || stored === "dark") return stored;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyMode(mode: Mode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try { localStorage.setItem("sas-theme", mode); } catch {}
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    setMode(readMode());
  }, []);

  const toggle = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  };

  const Icon = mode === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
