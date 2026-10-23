import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { importMarkdown } from "@/lib/admin/imports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/import/markdown")({
  component: MarkdownImport,
});

function MarkdownImport() {
  const fn = useServerFn(importMarkdown);
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const m = useMutation({ mutationFn: () => fn({ data: { files } }) });

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const out: { name: string; content: string }[] = [];
    for (const f of Array.from(list).slice(0, 10)) {
      out.push({ name: f.name, content: await f.text() });
    }
    setFiles(out);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Markdown</h1>
        <p className="text-sm text-muted-foreground">
          Drop one or more <code>.md</code> files (skills, playbooks, souls, guardrails). Each is
          parsed, normalised, categorised and staged through SkillForge.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            multiple
            accept=".md,.markdown,text/markdown"
            onChange={(e) => onFiles(e.target.files)}
            className="block w-full text-sm"
          />
          {files.length > 0 && (
            <ul className="text-xs text-muted-foreground">
              {files.map((f) => (
                <li key={f.name}>· {f.name} ({f.content.length} chars)</li>
              ))}
            </ul>
          )}
          <Button onClick={() => m.mutate()} disabled={files.length === 0 || m.isPending}>
            {m.isPending ? "Processing…" : `Analyse ${files.length || ""} file(s)`}
          </Button>
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
                <span className="truncate">{s.name}</span>
                {s.error ? <Badge variant="destructive">{s.error.slice(0, 40)}</Badge> : <Badge variant="secondary">drafted</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
