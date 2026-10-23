import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { validatePluginUpload, publishPluginUpload } from "@/lib/plugins/upload.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from "lucide-react";

export const Route = createFileRoute("/admin/plugins")({
  head: () => ({
    meta: [
      { title: "Publish Agent Plugins — Admin" },
      {
        name: "description",
        content:
          "Upload an Agent Plugins v1 .zip, run the conformance suite, and publish only conformant packages to /plugins.",
      },
    ],
  }),
  component: AdminPlugins,
});

type Check = { id: string; title: string; level: string; status: string; detail: string };
type Report = {
  conformant: boolean;
  failed: number;
  warnings: number;
  plugin_name: string | null;
  plugin_version: string | null;
  checks: Check[];
  skills: Array<{ dir: string; name: string; description: string; bytes: number }>;
};

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function ChecksCard({ report }: { report: Report }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          Conformance report
          {report.conformant ? (
            <Badge className="bg-emerald-500/15 text-emerald-600">Conformant</Badge>
          ) : (
            <Badge variant="destructive">{report.failed} blocking failure(s)</Badge>
          )}
          {report.warnings > 0 && <Badge variant="secondary">{report.warnings} warning(s)</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Plugin: <code>{report.plugin_name ?? "unknown"}</code>
          {report.plugin_version ? ` · v${report.plugin_version}` : ""} · {report.skills.length} skill component(s)
        </div>
        <ul className="divide-y rounded-md border">
          {report.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-3 py-2">
              <StatusIcon status={c.status} />
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {c.title}
                  {c.level === "recommended" && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      recommended
                    </span>
                  )}
                </div>
                <div className="break-words text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AdminPlugins() {
  const validate = useServerFn(validatePluginUpload);
  const publish = useServerFn(publishPluginUpload);
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const validation = useMutation({
    mutationFn: async () => {
      const f = file!;
      const b64 = await fileToBase64(f);
      setPayload(b64);
      return validate({ data: { filename: f.name, zip_base64: b64 } });
    },
    onSuccess: (d) => {
      setReport(d.report as Report);
      setResult(null);
    },
  });

  const publishing = useMutation({
    mutationFn: async (live: boolean) =>
      publish({ data: { filename: file!.name, zip_base64: payload!, publish: live } }),
    onSuccess: (d) => {
      setReport(d.report as Report);
      setResult(
        d.ok
          ? d.published
            ? `Published as /marketplace/${d.package!.slug} — now served by /api/public/plugins.json.`
            : `Saved as a private draft (${d.package!.slug}). Approve it in the review queue to list it.`
          : "Rejected: the archive is not conformant.",
      );
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Publish Agent Plugins</h1>
        <p className="text-sm text-muted-foreground">
          Upload an Agent Plugins v1 package (<code>.zip</code> with a root <code>plugin.json</code>,
          optional <code>mcp.json</code> and <code>skills/&lt;name&gt;/SKILL.md</code>). The conformance
          suite runs before anything is written, and only a conformant package can reach{" "}
          <code>/api/public/plugins.json</code>.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">1 · Upload and validate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
              setPayload(null);
              setResult(null);
            }}
            className="block w-full text-sm"
          />
          {file && (
            <div className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </div>
          )}
          <Button onClick={() => validation.mutate()} disabled={!file || validation.isPending}>
            {validation.isPending ? "Running conformance tests…" : "Run conformance tests"}
          </Button>
          {validation.isError && (
            <div className="text-xs text-destructive">{(validation.error as Error).message}</div>
          )}
        </CardContent>
      </Card>

      {report && <ChecksCard report={report} />}

      {report && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">2 · Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!report.conformant && (
              <div className="text-xs text-destructive">
                Publishing is blocked until every required check passes. Fix the package and re-upload.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => publishing.mutate(true)}
                disabled={!report.conformant || !payload || publishing.isPending}
              >
                {publishing.isPending ? "Working…" : "Validate again and publish live"}
              </Button>
              <Button
                variant="outline"
                onClick={() => publishing.mutate(false)}
                disabled={!report.conformant || !payload || publishing.isPending}
              >
                Save as private draft
              </Button>
            </div>
            {publishing.isError && (
              <div className="text-xs text-destructive">{(publishing.error as Error).message}</div>
            )}
            {result && <div className="text-sm">{result}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
