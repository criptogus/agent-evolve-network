import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { useState } from "react";
import { toast } from "sonner";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { createSharedRun } from "@/lib/runs/shared.functions";

type Pkg = { id: string; slug: string; name: string; description: string | null; is_published: boolean };

export const Route = createFileRoute("/run/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  loader: async ({ params, deps }) => {
    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,description,is_published")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !pkg) throw new Response("not found", { status: 404 });

    let sharedRun = null;
    const token = (deps as { token?: string } | undefined)?.token;
    if (token) {
      const { data: sr } = await supabaseAdmin
        .from("shared_runs")
        .select("prompt,output,created_at,view_count")
        .eq("share_token", token)
        .eq("package_slug", params.slug)
        .maybeSingle();
      sharedRun = sr ?? null;
      if (sr) {
        await supabaseAdmin
          .from("shared_runs")
          .update({ view_count: ((sr as { view_count: number }).view_count ?? 0) + 1 })
          .eq("share_token", token);
      }
    }

    return { pkg: pkg as Pkg, sharedRun };
  },
  loaderDeps: ({ search }) => ({ token: search.token }),
  head: ({ params, loaderData }) => ({
    meta: [
      { title: `Try ${loaderData?.pkg.name ?? params.slug} — Super Agent Skill` },
      { name: "description", content: `Run ${loaderData?.pkg.name ?? params.slug} on a sample prompt and share the result.` },
      { property: "og:title", content: `${loaderData?.pkg.name ?? params.slug} — try it now` },
    ],
  }),
  component: RunPage,
});

function RunPage() {
  const { pkg, sharedRun } = Route.useLoaderData();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await createSharedRun({ data: { package_slug: pkg.slug, prompt } });
      if (r.ok) {
        setToken(r.share_token);
        const url = `${window.location.origin}/run/${pkg.slug}?token=${r.share_token}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Run created — share link copied");
        window.history.replaceState({}, "", url);
      } else {
        toast.error(`Blocked: ${r.reason}`);
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SitePage>
    <main className="mx-auto max-w-2xl p-6">
      <a href={`/packs/${pkg.slug}`} className="text-sm underline text-muted-foreground">← {pkg.name}</a>

      <h1 className="text-3xl font-bold mt-3 mb-2">Try {pkg.name}</h1>
      <p className="text-muted-foreground mb-6">{pkg.description}</p>

      {!sharedRun && (
        <form onSubmit={run} className="space-y-3 mb-8">
          <textarea
            className="w-full border rounded p-3 min-h-[140px]"
            placeholder="Paste a prompt or sample input…"
            required minLength={4} maxLength={8000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-95 disabled:opacity-50"
          >
            {busy && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
            {busy ? "Running on the registry…" : "Run and share"}
          </button>
        </form>
      )}

      {busy && !sharedRun && (
        <section className="rounded-lg border bg-muted/20 p-5">
          <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-6 h-3 w-20 animate-pulse rounded bg-muted-foreground/20" />
          <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-2 h-4 w-4/6 animate-pulse rounded bg-muted-foreground/15" />
        </section>
      )}

      {sharedRun && (
        <section className="relative overflow-hidden rounded-lg border bg-muted/30 p-5">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="sas-watermark"
                x="0" y="0" width="220" height="120" patternUnits="userSpaceOnUse"
                patternTransform="rotate(-22)"
              >
                <text
                  x="0" y="60"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize="14" fontWeight="600"
                  letterSpacing="0.18em"
                  textAnchor="start"
                  className="fill-foreground"
                >
                  SUPER · AGENT · SKILL
                </text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sas-watermark)" />
          </svg>
          <div className="relative">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-muted-foreground">Prompt</h2>
            <pre className="mb-4 whitespace-pre-wrap text-sm">{sharedRun.prompt}</pre>
            <h2 className="mb-2 text-sm uppercase tracking-wide text-muted-foreground">Output</h2>
            <pre className="whitespace-pre-wrap text-sm">{sharedRun.output}</pre>
            <footer className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>Shared run · {new Date(sharedRun.created_at).toLocaleString()} · {sharedRun.view_count + 1} views</span>
              <a className="underline" href={`/packs/${pkg.slug}`}>Open in {pkg.name} →</a>
            </footer>
          </div>
        </section>
      )}

      {token && (
        <p className="mt-4 text-sm text-muted-foreground">
          Share link copied to your clipboard.
        </p>
      )}

      <section className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        Want full output without watermark?{" "}
        <a className="underline" href={`/signup?next=/packs/${pkg.slug}`}>Create an account</a>{" "}
        or install locally with <code className="bg-muted px-1">npx super-agent install {pkg.slug}</code>.
      </section>
    </main>
    </SitePage>
  );
}
