import { useState } from "react";
import { FileCode2, Play, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Package } from "@/data/packages";

type Frame = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Window chrome title. */
  filename: string;
  body: string;
  tone: "terminal" | "editor";
};

/**
 * Screenshot-style preview gallery.
 *
 * Packages have no uploaded images, so every frame is rendered live from the
 * package's own published content (install commands, system prompt, examples).
 * That keeps the visual weight of a screenshot gallery without inventing
 * marketing imagery.
 */
export function PackageGallery({ pkg, gatewayUrl }: { pkg: Package; gatewayUrl: string }) {
  const frames: Frame[] = [
    {
      id: "install",
      label: "Install",
      icon: Terminal,
      filename: "terminal",
      tone: "terminal",
      body: [
        `$ npx super-agent install ${pkg.id}`,
        "",
        `→ resolving ${pkg.id}@${pkg.latest}`,
        `→ runtimes ......... ${pkg.compatibility.map((c) => c.runtime).join(", ") || "any MCP client"}`,
        `→ scopes ........... ${pkg.scopes.join(", ") || "none"}`,
        "",
        `✓ ${pkg.name} is available to your agent`,
        "",
        "# or point any MCP client at the gateway:",
        `# ${gatewayUrl}`,
      ].join("\n"),
    },
    ...(pkg.systemPrompt
      ? [
          {
            id: "prompt",
            label: "System prompt",
            icon: FileCode2,
            filename: `${pkg.id}.system-prompt.md`,
            tone: "editor" as const,
            body: pkg.systemPrompt.split("\n").slice(0, 26).join("\n"),
          },
        ]
      : []),
    ...pkg.examples.slice(0, 3).map((ex, i) => ({
      id: `example-${i}`,
      label: ex.title,
      icon: Play,
      filename: `${pkg.id} · example`,
      tone: "editor" as const,
      body: ex.body,
    })),
  ];

  const [active, setActive] = useState(0);
  const frame = frames[Math.min(active, frames.length - 1)];
  if (!frame) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5 sm:px-4">
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </span>
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {frame.filename}
          </span>
        </div>
        <pre
          className={`max-h-[320px] overflow-auto px-4 py-4 text-[11.5px] leading-relaxed sm:max-h-[420px] sm:px-5 sm:text-[12.5px] ${
            frame.tone === "terminal"
              ? "bg-[oklch(0.14_0.01_270)] font-mono text-white/90"
              : "whitespace-pre-wrap break-words font-mono text-foreground/90"
          }`}
        >
          {frame.body}
        </pre>
      </div>

      {frames.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {frames.map((f, i) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:max-w-[220px] ${
                  i === active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{f.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Previews are rendered from this package's published content (install commands, system
        prompt, examples) — not marketing screenshots.
      </p>
    </div>
  );
}
