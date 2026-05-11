import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  startCustomization,
  runCustomization,
  getCustomization,
  getPack,
  listMyCustomizations,
} from "@/lib/packs/packs.functions";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/packs/$slug/customize")({
  component: CustomizePack,
  head: () => ({ meta: [{ title: "Customize pack" }] }),
});

function CustomizePack() {
  const { slug } = Route.useParams();
  const packFn = useServerFn(getPack);
  const startFn = useServerFn(startCustomization);
  const runFn = useServerFn(runCustomization);
  const getFn = useServerFn(getCustomization);
  const listFn = useServerFn(listMyCustomizations);
  const qc = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState({ brief: "", niche: "", audience: "", voice: "" });

  const { data: pack } = useQuery({ queryKey: ["pack", slug], queryFn: () => packFn({ data: { slug } }) });
  const { data: list } = useQuery({
    queryKey: ["pack-customizations", pack?.pack.id],
    queryFn: () => listFn({ data: { pack_id: pack!.pack.id } }),
    enabled: !!pack,
  });

  const { data: cust } = useQuery({
    queryKey: ["pack-customization", activeId],
    queryFn: () => getFn({ data: { customization_id: activeId! } }),
    enabled: !!activeId,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s === "ready" || s === "error" ? false : 2000;
    },
  });

  const start = useMutation({
    mutationFn: () =>
      startFn({
        data: {
          pack_id: pack!.pack.id,
          brief: form.brief,
          niche: form.niche || undefined,
          audience: form.audience || undefined,
          voice: form.voice || undefined,
        },
      }),
    onSuccess: async (r) => {
      setActiveId(r.customization_id);
      qc.invalidateQueries({ queryKey: ["pack-customizations", pack?.pack.id] });
      run.mutate(r.customization_id);
    },
    onError: (e: any) => toast.error(String(e?.message || e)),
  });

  const run = useMutation({
    mutationFn: (id: string) => runFn({ data: { customization_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pack-customization", activeId] }),
    onError: (e: any) => toast.error(String(e?.message || e)),
  });

  if (!pack) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (!pack.owned) {
    return (
      <Shell>
        <p className="text-muted-foreground">You need to purchase this pack first.</p>
        <Button asChild className="mt-4"><Link to="/packs/$slug" params={{ slug }}>Back to pack</Link></Button>
      </Shell>
    );
  }

  const status = (cust as any)?.status as string | undefined;
  const items = ((cust as any)?.items ?? []) as Array<{
    name: string; type: string; role: string; customized_system_prompt: string; customization_notes: string;
    preserved_rules: string[]; added_rules: string[]; slug: string;
  }>;

  return (
    <Shell>
      <Link to="/packs/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:underline">← Back to pack</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Customize {pack.pack.name}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Describe your niche and audience. The customizer first researches the state of the art for this pack’s topic,
        then adapts every item to your context — without regressing below world-class quality.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Brief</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Niche / industry</Label>
              <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="e.g. boutique law firm specializing in immigration" />
            </div>
            <div>
              <Label>Audience</Label>
              <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="e.g. founders, HR leads at mid-size US tech companies" />
            </div>
            <div>
              <Label>Voice</Label>
              <Input value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}
                placeholder="e.g. clear, plainspoken, never legalese" />
            </div>
            <div>
              <Label>Free-form brief</Label>
              <Textarea rows={6} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })}
                placeholder="What outcomes, taboos, regulations, examples, off-limits topics?" />
            </div>
            <Button
              className="w-full"
              disabled={start.isPending || form.brief.trim().length < 20}
              onClick={() => start.mutate()}
            >
              {start.isPending ? "Starting…" : "Customize this pack"}
            </Button>
            {list && list.customizations.length > 0 && (
              <div className="pt-3">
                <p className="text-xs text-muted-foreground">Previous customizations</p>
                <div className="mt-1 space-y-1">
                  {list.customizations.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className="block w-full rounded border border-border px-2 py-1 text-left text-xs hover:bg-muted"
                    >
                      <span className="font-mono">{c.id.slice(0, 8)}</span> · {c.status} · {c.niche || "(no niche)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Result</span>
              {status && <Badge variant={status === "ready" ? "default" : "secondary"}>{status}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cust && <p className="text-sm text-muted-foreground">Submit a brief to start.</p>}
            {cust && (
              <>
                <Phase label="Research state of the art" done={status !== "queued" && status !== "researching"} active={status === "researching"} />
                <Phase label="Customize each item" done={status === "ready"} active={status === "customizing"} />
                <Phase label="Bundle ready" done={status === "ready"} />
                {(cust as any).research_summary && (
                  <div className="rounded border border-border p-3 text-sm">
                    <p className="font-semibold">State-of-the-art brief</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{(cust as any).research_summary}</p>
                  </div>
                )}
                {items.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Customized items ({items.length})</p>
                    {items.map((it) => (
                      <details key={it.slug} className="rounded border border-border">
                        <summary className="cursor-pointer px-3 py-2 text-sm">
                          <span className="font-medium">{it.name}</span>
                          <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">{it.type}</span>
                          <Badge variant={it.role === "core" ? "default" : "secondary"} className="ml-2">{it.role}</Badge>
                        </summary>
                        <div className="space-y-2 px-3 py-2 text-xs">
                          {it.customization_notes && (
                            <p className="text-muted-foreground"><b>Notes:</b> {it.customization_notes}</p>
                          )}
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px] leading-relaxed">{it.customized_system_prompt}</pre>
                          {(it.preserved_rules?.length || it.added_rules?.length) ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Preserved</p>
                                <ul className="list-disc pl-4">{(it.preserved_rules || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Added</p>
                                <ul className="list-disc pl-4">{(it.added_rules || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
                {status === "ready" && activeId && (
                  <DownloadButtons customizationId={activeId} />
                )}
                {status === "error" && (
                  <p className="text-sm text-destructive">Error: {(cust as any).error}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Phase({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
          done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary animate-pulse" : "border-border text-muted-foreground"
        }`}
      >
        {done ? "✓" : active ? "·" : ""}
      </span>
      <span className={done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-10">{children}</main>
      <Footer />
    </div>
  );
}

function DownloadButtons({ customizationId }: { customizationId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (ext: "md" | "json") => {
    setBusy(ext);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) { toast.error("Sign in again to download."); return; }
      const res = await fetch(`/api/packs/customization/${customizationId}/download/${ext}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error(await res.text()); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customized.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(null); }
  };
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button onClick={() => download("md")} disabled={busy !== null}>
        {busy === "md" ? "Preparing…" : "Download Markdown bundle"}
      </Button>
      <Button variant="outline" onClick={() => download("json")} disabled={busy !== null}>
        {busy === "json" ? "Preparing…" : "Download JSON bundle"}
      </Button>
    </div>
  );
}
