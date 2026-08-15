import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_PROVIDERS,
  providerDir,
  skillPath,
  type SyncScope,
} from "@/lib/cloud-skills/providers";

/**
 * "Use your library anywhere" panel: pick the agent tool, see exactly where
 * skills land, and copy a ready-made prompt that makes the agent run the sync
 * through MCP.
 */
export function SyncAnywhere({ exampleSlug }: { exampleSlug?: string }) {
  const [providerId, setProviderId] = useState(AGENT_PROVIDERS[0]!.id);
  const [scope, setScope] = useState<SyncScope>("user");

  const provider = useMemo(
    () => AGENT_PROVIDERS.find((p) => p.id === providerId) ?? AGENT_PROVIDERS[0]!,
    [providerId],
  );
  const slug = exampleSlug ?? "my-skill";
  const dir = providerDir(provider, scope);
  const path = skillPath(provider, scope, slug);

  const prompt = `Sync my Super Agent Skill cloud library into ${provider.label}.
1. Call cloud_skills_providers to confirm the target directory.
2. List what is already in ${dir} and call cloud_skills_sync with provider="${provider.id}", scope="${scope}" and that inventory.
3. Write every create/update entry to its path with the returned content, skip unchanged, and ask me before deleting orphans.`;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 bg-card">
      <header className="border-b border-border/60 px-5 py-4">
        <h2 className="text-sm font-semibold">Use your library anywhere</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One online library, {AGENT_PROVIDERS.length} agent tools. Your agent pulls the skills over
          MCP and writes them to the right directory — no manual copying between
          Hermes, Claude Code, Codex and Cursor.
        </p>
      </header>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {AGENT_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProviderId(p.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                p.id === providerId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["user", "project"] as SyncScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              disabled={s === "project" && !provider.projectDir}
              className={`rounded-md border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
                s === scope
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "user" ? "Global (all projects)" : "This project only"}
            </button>
          ))}
          <Badge variant="outline" className="font-mono text-[10px]">
            {provider.format}
          </Badge>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Target directory
            </dt>
            <dd className="mt-1 break-all font-mono text-xs">{dir}</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              File written per skill
            </dt>
            <dd className="mt-1 break-all font-mono text-xs">{path}</dd>
          </div>
        </dl>

        {provider.notes && (
          <p className="text-xs text-muted-foreground">{provider.notes}</p>
        )}

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Prompt for your agent
            </span>
            <Button size="sm" variant="outline" onClick={() => copy(prompt, "Prompt")}>
              Copy
            </Button>
          </div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {prompt}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">cloud_skills_providers</code>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">cloud_skills_sync</code>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">cloud_skills_sync_all</code>
          <span>
            — version-aware diff: unchanged skills are skipped, updates are rewritten, orphans are
            reported but never deleted silently.
          </span>
        </div>
      </div>
    </section>
  );
}
