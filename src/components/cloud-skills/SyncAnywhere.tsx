import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PROVIDERS,
  getProvider,
  scopesFor,
  syncPrompt,
  targetPath,
  type ProviderScope,
} from "@/lib/cloud-skills/providers";
import { CONFLICT_STRATEGIES, type ConflictStrategy } from "@/lib/cloud-skills/conflicts";

/**
 * "Use your library anywhere" panel. The library is private to the account —
 * this only tells the user (and their agent) where the files land locally.
 */
export function SyncAnywhere({ sampleSlug = "my-skill" }: { sampleSlug?: string }) {
  const [toolId, setToolId] = useState(PROVIDERS[0]!.id);
  const provider = getProvider(toolId)!;
  const scopes = scopesFor(provider);
  const [scope, setScope] = useState<ProviderScope>(scopes[0]!);
  const [strategy, setStrategy] = useState<ConflictStrategy>("ask");
  const activeScope = scopes.includes(scope) ? scope : scopes[0]!;

  const path = useMemo(
    () => targetPath(provider, activeScope, sampleSlug),
    [provider, activeScope, sampleSlug],
  );
  const prompt = useMemo(
    () => syncPrompt(provider.id, activeScope, strategy),
    [provider, activeScope, strategy],
  );
  const activeStrategy = CONFLICT_STRATEGIES.find((c) => c.id === strategy)!;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Use your library anywhere</h2>
        <Badge variant="secondary">Private to your account</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Your skills stay encrypted in your private library and are never shared with other
        users. Pick a tool and your agent writes them at the exact path that tool reads.
      </p>

      <div className="mt-5">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Agent tool
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

      <div className="mt-5">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          If the skill already exists there
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONFLICT_STRATEGIES.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={c.id === strategy ? "default" : "outline"}
              onClick={() => setStrategy(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{activeStrategy.description}</p>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Target path
        </div>
        <code className="mt-2 block break-all font-mono text-sm">{path}</code>
        <p className="mt-2 text-xs text-muted-foreground">{provider.note}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copy(path ?? "", "Path")}>
            Copy path
          </Button>
          <Button size="sm" onClick={() => copy(prompt, "Prompt")}>
            Copy sync prompt
          </Button>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Paste the prompt in {provider.label}. It calls{" "}
        <code className="font-mono">cloud_skills_sync</code> over MCP, skips skills that are
        already up to date and never deletes local files.
      </p>
    </section>
  );
}
