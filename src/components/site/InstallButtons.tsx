/**
 * One-click install buttons for MCP-aware clients that accept deep-link
 * install URLs. These are URI schemes the desktop apps register on
 * install — clicking the link in the browser hands off to the app with
 * the server config pre-filled, so the user goes from "I clicked"
 * to "tools are loaded" without ever opening a JSON file.
 *
 * Schemes used:
 *  - Cursor:  cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=…
 *  - VS Code: vscode:mcp/install?<urlencoded JSON>
 *  - VS Code Insiders: vscode-insiders:mcp/install?<urlencoded JSON>
 *
 * Clients without a registered scheme (Claude Desktop, Zed, etc.) get a
 * copy-config fallback handled by the surrounding page, so we just don't
 * render a button for them here.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink } from "lucide-react";
import { recordFunnelEvent } from "@/lib/telemetry/funnel.functions";

const ENDPOINT = "https://superagentskill.com/api/public/mcp";
const SERVER_NAME = "super-agent-skill";

function cursorInstallUrl(): string {
  // Cursor deep-link encodes a base64(JSON) server config.
  const config = { url: ENDPOINT };
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(JSON.stringify(config)).toString("base64")
      : btoa(JSON.stringify(config));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
    SERVER_NAME,
  )}&config=${encodeURIComponent(b64)}`;
}

function vscodeInstallUrl(insiders = false): string {
  // VS Code deep-link expects a urlencoded JSON descriptor.
  const descriptor = {
    name: SERVER_NAME,
    gallery: false,
    type: "http",
    url: ENDPOINT,
  };
  const scheme = insiders ? "vscode-insiders" : "vscode";
  return `${scheme}:mcp/install?${encodeURIComponent(JSON.stringify(descriptor))}`;
}

type ButtonSpec = {
  id: string;
  label: string;
  href: string;
  hint: string;
};

const BUTTONS: ButtonSpec[] = [
  {
    id: "cursor",
    label: "Install in Cursor",
    href: cursorInstallUrl(),
    hint: "Opens Cursor and pre-fills the MCP server config.",
  },
  {
    id: "vscode",
    label: "Install in VS Code",
    href: vscodeInstallUrl(false),
    hint: "VS Code 1.93+ — adds the server to user settings.",
  },
  {
    id: "vscode-insiders",
    label: "Install in VS Code Insiders",
    href: vscodeInstallUrl(true),
    hint: "Same as VS Code but targets the Insiders build.",
  },
];

export function InstallButtons({ compact = false }: { compact?: boolean }) {
  const [clicked, setClicked] = useState<string | null>(null);
  const track = useServerFn(recordFunnelEvent);
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-3"}>
      {BUTTONS.map((b) => (
        <a
          key={b.id}
          href={b.href}
          onClick={() => {
            setClicked(b.id);
            void track({
              data: { event: "install_button_clicked", client_name: b.id },
            }).catch(() => {});
            // The OS hand-off can be silent if the app isn't installed.
            // Clear after 4s so users can retry.
            setTimeout(() => setClicked((c) => (c === b.id ? null : c)), 4000);
          }}
          className={
            compact
              ? "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent"
              : "group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
          }
        >
          {compact ? (
            <>
              {clicked === b.id ? (
                <Check className="h-3.5 w-3.5 text-signal" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              {b.label}
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-primary">
                {clicked === b.id ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{b.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{b.hint}</span>
              </span>
            </>
          )}
        </a>
      ))}
    </div>
  );
}
