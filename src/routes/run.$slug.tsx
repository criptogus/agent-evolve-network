import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
          <button disabled={busy} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50">
            {busy ? "Running…" : "Run and share"}
          </button>
        </form>
      )}

      {sharedRun && (
        <section className="border rounded p-4 bg-muted/30 relative">
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-3xl font-bold tracking-widest"
            style={{ transform: "rotate(-20deg)" }}
          >
            powered by super-agent-skill
          </div>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Prompt</h2>
          <pre className="whitespace-pre-wrap text-sm mb-4">{sharedRun.prompt}</pre>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Output</h2>
          <pre className="whitespace-pre-wrap text-sm">{sharedRun.output}</pre>
          <footer className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>Shared run · {new Date(sharedRun.created_at).toLocaleString()} · {sharedRun.view_count + 1} views</span>
            <a className="underline" href={`/packs/${pkg.slug}`}>Open in {pkg.name} →</a>
          </footer>
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
  );
}
