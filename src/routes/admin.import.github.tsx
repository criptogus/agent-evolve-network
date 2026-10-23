import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { importFromGithub } from "@/lib/admin/imports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/import/github")({
  component: GithubImport,
});

function GithubImport() {
  const fn = useServerFn(importFromGithub);
  const [url, setUrl] = useState("");
  const m = useMutation({ mutationFn: () => fn({ data: { repoUrl: url, maxFiles: 8 } }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import from GitHub</h1>
        <p className="text-sm text-muted-foreground">
          Paste a public repo URL. We scan for prompts, skills, playbooks, guardrails and refine
          each one through the SkillForge meta-agent before staging it for review.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Repository URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={() => m.mutate()} disabled={!url || m.isPending}>
              {m.isPending ? "Analysing…" : "Import"}
            </Button>
          </div>
          {m.isError && <div className="text-xs text-destructive">{(m.error as Error).message}</div>}
        </CardContent>
      </Card>

      {m.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Staged ({m.data.staged.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {m.data.staged.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="truncate font-mono text-xs">{s.path}</span>
                {s.error ? (
                  <Badge variant="destructive">{s.error.slice(0, 40)}</Badge>
                ) : (
                  <Badge variant="secondary">drafted</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
