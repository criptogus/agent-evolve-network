import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { bulkUploadPackages } from "@/lib/uploads/uploads.functions";

type Staged = {
  name: string;
  content: string;
  type: "auto" | "skill" | "playbook" | "soul" | "guardrail";
};

type ResultRow = {
  name: string;
  ok: boolean;
  package_id?: string;
  slug?: string;
  type?: string;
  forge_report_url?: string;
  error?: string;
};

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Bulk upload skills — Super Agent Skill" },
      {
        name: "description",
        content:
          "Drag-drop multiple skill, playbook, soul or guardrail files. The forge pipeline normalises and registers each one as a draft package.",
      },
    ],
  }),
  component: UploadPage,
});

const ACCEPT = ".md,.markdown,.txt,.json,.prompt";
const MAX_FILES = 10;
const MAX_BYTES = 120_000;

function UploadPage() {
  const [files, setFiles] = useState<Staged[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fn = useServerFn(bulkUploadPackages);

  const mut = useMutation({
    mutationFn: (payload: { files: { name: string; content: string; type?: Staged["type"] }[] }) =>
      fn({ data: payload }),
    onSuccess: (res) => setResults(res.results),
    onError: (e: Error) =>
      setError(e?.message?.includes("Unauthorized") ? "Sign in to upload." : e?.message ?? "Upload failed"),
  });

  function ingest(list: FileList | File[]) {
    const arr = Array.from(list).slice(0, MAX_FILES - files.length);
    Promise.all(
      arr.map(
        (f) =>
          new Promise<Staged | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const content = String(reader.result ?? "").slice(0, MAX_BYTES);
              if (content.trim().length < 20) return resolve(null);
              resolve({ name: f.name, content, type: "auto" });
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(f);
          })
      )
    ).then((rows) => {
      const next = [...files, ...rows.filter(Boolean) as Staged[]].slice(0, MAX_FILES);
      setFiles(next);
    });
  }

  function submit() {
    setError(null);
    setResults(null);
    mut.mutate({
      files: files.map((f) => ({
        name: f.name,
        content: f.content,
        type: f.type === "auto" ? undefined : f.type,
      })),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Upload</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Bulk-upload skills</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Drop up to {MAX_FILES} files (Markdown, prompts, JSON). Each one is normalised by the SkillForge author
          pipeline, classified (skill / playbook / soul / guardrail), and registered as a draft package owned by you.
          Anything you can do here is also available via MCP — see{" "}
          <Link to="/account/tokens" className="text-primary underline-offset-2 hover:underline">/account/tokens</Link>.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center transition-colors hover:border-primary/60"
        >
          <div className="text-base font-medium">Drop files here, or click to browse</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ACCEPT.replace(/\./g, "").toUpperCase().replace(/,/g, " · ")} · up to {MAX_FILES} files · {MAX_BYTES / 1000}KB each
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => e.target.files && ingest(e.target.files)}
          />
        </div>

        {/* Staged list */}
        {files.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {files.length} file{files.length === 1 ? "" : "s"} ready
              </div>
              <button onClick={() => setFiles([])} className="text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </div>
            <ul className="divide-y divide-border/60">
              {files.map((f, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{Math.ceil(f.content.length / 1000)} KB · {f.content.split(/\s+/).length} words</div>
                  </div>
                  <select
                    value={f.type}
                    onChange={(e) => {
                      const next = [...files];
                      next[i] = { ...f, type: e.target.value as Staged["type"] };
                      setFiles(next);
                    }}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="skill">Skill</option>
                    <option value="playbook">Playbook</option>
                    <option value="soul">Soul</option>
                    <option value="guardrail">Guardrail</option>
                  </select>
                  <button
                    onClick={() => setFiles(files.filter((_, k) => k !== i))}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted-foreground">
            Uploads are saved as private drafts. Listing on the public marketplace
            requires submitting for review and admin approval.
          </p>
          <button
            onClick={submit}
            disabled={files.length === 0 || mut.isPending}
            className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {mut.isPending ? `Forging ${files.length} skill${files.length === 1 ? "" : "s"}…` : `Forge ${files.length || ""} skill${files.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}{" "}
            {error.toLowerCase().includes("sign in") && (
              <Link to="/connect" className="underline">Connect your agent →</Link>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">Results</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-4 py-3">File</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Report</th></tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                      <td className="px-4 py-3">
                        {r.ok ? (
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">forged</span>
                        ) : (
                          <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive" title={r.error}>
                            failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{r.type ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.slug ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {r.forge_report_url ? (
                          <a href={r.forge_report_url} className="text-primary hover:underline">View →</a>
                        ) : (
                          r.error ?? "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
