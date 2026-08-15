import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROVIDERS, getProvider, scopesFor, type ProviderScope } from "@/lib/cloud-skills/providers";
import { bundlePath } from "@/lib/cloud-skills/bundle";
import { exportSkillBundle } from "@/lib/cloud-skills/bundle.functions";

function download(filename: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * "Export as a private package" panel: one zip, already shaped for the chosen
 * tool, downloadable and usable offline.
 */
export function ExportBundle({
  skills = [],
}: {
  skills?: { id: string; slug: string; name: string }[];
}) {
  const [toolId, setToolId] = useState(PROVIDERS[0]!.id);
  const provider = getProvider(toolId)!;
  const scopes = scopesFor(provider);
  const [scope, setScope] = useState<ProviderScope>(scopes[0]!);
  const activeScope = scopes.includes(scope) ? scope : scopes[0]!;
  const [selected, setSelected] = useState<string[]>([]);

  const exportFn = useServerFn(exportSkillBundle);
  const chosen = selected.length ? skills.filter((s) => selected.includes(s.id)) : skills;

  const preview = useMemo(
    () =>
      chosen
        .slice(0, 4)
        .map((s) => bundlePath(provider, activeScope, s.slug))
        .filter(Boolean) as string[],
    [chosen, provider, activeScope],
  );

  const mut = useMutation({
    mutationFn: () =>
      exportFn({ data: { tool: provider.id, scope: activeScope, skill_ids: selected } }),
    onSuccess: (r) => {
      download(r.filename, r.base64);
      toast.success(
        `${r.skill_count} skill${r.skill_count === 1 ? "" : "s"} exported for ${r.tool.label}`,
        {
          description: r.integrity.signed
            ? `Signed archive — run "bash verify.sh" to check it (digest ${r.integrity.content_digest.slice(0, 12)}...)`
            : "Bundle is hashed but unsigned on this deployment — verify.sh will report it.",
        },
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Export failed"),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Offline backup archive (.zip)</h2>
        <Badge variant="outline">Backup only — not an installer</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        A signed snapshot of your own skills, in the folder structure the tool expects, for
        offline copies, audits and air-gapped machines.{" "}
        <strong className="text-foreground">
          Installing into Claude Code, Codex, Cursor and friends always goes through MCP
        </strong>{" "}
        — use the sync prompt above so versions and conflicts stay tracked. The archive ships
        no install script on purpose.
      </p>

      <div className="mt-5">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Target tool
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={p.id === toolId ? "default" : "outline"}
              onClick={() => {
                setToolId(p.id);
                setScope(scopesFor(p)[0]!);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Scope
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {scopes.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === activeScope ? "default" : "outline"}
              onClick={() => setScope(s)}
            >
              {s === "project" ? "This project" : "All projects (global)"}
            </Button>
          ))}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Skills
            </div>
            {selected.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Select all ({skills.length})
              </Button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((s) => {
              const on = selected.length === 0 || selected.includes(s.id);
              return (
                <Button
                  key={s.id}
                  size="sm"
                  variant={on ? "secondary" : "outline"}
                  onClick={() => toggle(s.id)}
                >
                  {s.slug}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {selected.length === 0
              ? "Whole library included. Tap a skill to export only a subset."
              : `${selected.length} selected.`}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Inside the archive
        </div>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {preview.map((p) => (
            <li key={p} className="break-all">
              {p}
            </li>
          ))}
          {chosen.length > preview.length && (
            <li className="text-muted-foreground">+{chosen.length - preview.length} more</li>
          )}
          <li className="break-all">README.md</li>
          <li className="break-all">verify.sh</li>
          <li className="break-all">sak-bundle.json</li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          {activeScope === "global"
            ? "Global files are staged under home/, mirroring $HOME."
            : "Project files mirror your repo root."}{" "}
          Nothing here touches your machine — copying files by hand skips version tracking and
          conflict detection, so prefer MCP sync.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tamper-evident: <code className="font-mono">sak-bundle.json</code> carries a sha256 for
          every file plus an Ed25519 signature over the combined digest.{" "}
          <code className="font-mono">bash verify.sh</code> fails loudly if either does not match.
        </p>
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || chosen.length === 0}
          >
            {mut.isPending ? "Packaging..." : `Download backup .zip for ${provider.label}`}
          </Button>
        </div>
      </div>
    </section>
  );
}
