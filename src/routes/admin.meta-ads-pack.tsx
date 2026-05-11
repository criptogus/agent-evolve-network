import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listMetaAdsBlueprints,
  generateMetaAdsBlueprint,
  assembleMetaAdsPack,
} from "@/lib/admin/meta-ads-pack.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/meta-ads-pack")({
  component: MetaAdsPackPage,
});

const TYPE_COLOR: Record<string, string> = {
  skill: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  playbook: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  soul: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  guardrail: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function MetaAdsPackPage() {
  const list = useServerFn(listMetaAdsBlueprints);
  const gen = useServerFn(generateMetaAdsBlueprint);
  const assemble = useServerFn(assembleMetaAdsPack);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["meta-ads-pack"], queryFn: () => list({ data: undefined as any }) });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  const genOne = useMutation({
    mutationFn: (id: string) => gen({ data: { blueprint_id: id, publish: true, overwrite } }),
  });
  const assembleM = useMutation({ mutationFn: () => assemble({ data: undefined as any }) });

  const blueprints = q.data?.blueprints ?? [];
  const pack = q.data?.pack;
  const generated = blueprints.filter((b) => b.existing).length;
  const total = blueprints.length;

  async function generateAll() {
    setLog([]);
    for (const bp of blueprints) {
      if (bp.existing && !overwrite) {
        setLog((l) => [...l, `· ${bp.slug} — skipped (exists)`]);
        continue;
      }
      setBusyId(bp.id);
      try {
        const r = await genOne.mutateAsync(bp.id);
        setLog((l) => [...l, `✓ ${bp.slug} — ${r.status}`]);
      } catch (e: any) {
        setLog((l) => [...l, `✗ ${bp.slug} — ${e?.message ?? "failed"}`]);
      }
    }
    setBusyId(null);
    await qc.invalidateQueries({ queryKey: ["meta-ads-pack"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meta Ads Pack — automated build</h1>
        <p className="text-sm text-muted-foreground">
          Generates 22 tool-grounded primitives (15 skills · 4 playbooks · 1 soul · 2 guardrails) from the{" "}
          <a className="underline" href="https://github.com/mikusnuz/meta-ads-mcp" target="_blank" rel="noreferrer">
            meta-ads-mcp
          </a>{" "}
          catalog (135 tools, Meta Marketing API v25.0), then assembles them into a single sellable pack.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Progress · {generated}/{total} primitives · pack {pack ? "exists" : "not assembled"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            Overwrite existing primitives (regenerate)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateAll} disabled={!!busyId}>
              {busyId ? "Generating…" : `Generate all (${total})`}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const r = await assembleM.mutateAsync();
                setLog((l) => [...l, `pack: ${JSON.stringify(r)}`]);
                await qc.invalidateQueries({ queryKey: ["meta-ads-pack"] });
              }}
              disabled={generated < total || assembleM.isPending}
            >
              {assembleM.isPending ? "Assembling…" : pack ? "Re-assemble pack" : "Assemble pack"}
            </Button>
          </div>
          {log.length > 0 && (
            <pre className="max-h-60 overflow-auto rounded border bg-muted/30 p-2 text-[11px]">
              {log.join("\n")}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Blueprints ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {blueprints.map((bp) => (
              <li key={bp.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_COLOR[bp.type]}>{bp.type}</Badge>
                    <span className="truncate text-sm font-medium">{bp.name}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{bp.slug}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {bp.existing ? (
                    <Badge variant="outline" className="text-[10px]">
                      v{bp.existing.latest_version}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      pending
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === bp.id || (!!bp.existing && !overwrite)}
                    onClick={async () => {
                      setBusyId(bp.id);
                      try {
                        const r = await genOne.mutateAsync(bp.id);
                        setLog((l) => [...l, `✓ ${bp.slug} — ${r.status}`]);
                      } catch (e: any) {
                        setLog((l) => [...l, `✗ ${bp.slug} — ${e?.message ?? "failed"}`]);
                      }
                      setBusyId(null);
                      await qc.invalidateQueries({ queryKey: ["meta-ads-pack"] });
                    }}
                  >
                    {busyId === bp.id ? "…" : bp.existing ? (overwrite ? "Regenerate" : "Done") : "Generate"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
